# Testing

Datastar Kit is easiest to test at the same boundary it runs at: native `Request` in, native `Response` out.

## Handler tests

Prefer calling fetch-compatible handlers directly:

```ts
const response = await app.fetch(
  new Request("http://test.local/todos/add", {
    method: "POST",
    body: JSON.stringify({ title: "Ship docs" })
  })
)

expect(response.status).toBe(204)
```

This keeps tests close to production behavior and avoids framework mocks for SDK-shaped code.

For Datastar actions, build a normal request with the same JSON signal payload the browser sends:

```ts
const response = await app.fetch(
  new Request("http://test.local/todos", {
    method: "POST",
    headers: { "datastar-request": "true" },
    body: JSON.stringify({ title: "Ship docs" })
  })
)

expect(response.status).toBe(200)
expect(response.headers.get("content-type")).toBe("text/event-stream")
expect(await response.text()).toContain("datastar-patch-elements")
```

## Reading Datastar events

Searching the raw SSE text passes for the wrong target or patch mode. `readEvents()` from `datastar-kit/testing` decodes the response into one object per event instead, with Datastar's defaults filled in:

```ts
import { readEvents } from "datastar-kit/testing"

const events = await readEvents(response)

expect(events).toEqual([
  expect.objectContaining({ type: "patch-elements", selector: "#todos", mode: "inner" }),
  expect.objectContaining({ type: "patch-signals", signals: { title: "" } })
])
```

| Event              | Fields                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"patch-elements"` | `selector`, `mode` (default `"outer"`), `namespace` (default `"html"`), `useViewTransition`, `viewTransitionSelector`, `elements`, `id`, `retry` (default `1000`) |
| `"patch-signals"`  | `signals` (parsed JSON), `onlyIfMissing`, `id`, `retry` (default `1000`)                                                                                          |

Comments such as stream heartbeats are skipped. `event.script()` and `event.navigate()` arrive as `"patch-elements"` events that append a `<script>` to `body`, because that is how Datastar sends them.

For long-lived streams, pass `count`. `readEvents()` stops after that many events and cancels the response body, which stops your stream's source:

```ts
const [first, second] = await readEvents(response, { count: 2 })
```

Without `count`, `readEvents()` reads until the stream ends, so a stream that never ends never resolves.

`readEvents()` throws a `DatastarEventError` when the response is not `text/event-stream`, contains an event Datastar does not handle, or ends partway through an event. A `reply.done()` response decodes to `[]`.

See `examples/hono-todos` for a complete app with tests that cover the initial HTML page, signal validation errors, element patches, and ordinary `404` responses.

## What to test

| Layer                     | Good coverage                                                               |
| ------------------------- | --------------------------------------------------------------------------- |
| Pure helpers              | Datastar attributes, expression rendering, HTML escaping, prop merging.     |
| Request/response handlers | `read.signals`, auth and validation behavior, `reply.*` status and headers. |
| Protocol helpers          | SSE encoding, patch options, signal patch options, stream chunks.           |
| Examples                  | Runtime wiring and copyable application patterns.                           |
| Browser behavior          | Assumptions that require the real Datastar browser runtime.                 |

Use browser/runtime tests for behavior that unit tests cannot prove, such as how Datastar applies a patch in the DOM.

Observability is app-owned. Test your logging, tracing, metrics, and OpenTelemetry setup through the platform libraries you use in production.

Next: [Examples](examples.md).
