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

## Flight Recorder

Use `datastar-kit/testing` when a test should explain the Datastar protocol instead of matching raw SSE strings:

```ts
import { read, reply } from "datastar-kit"
import { assertDatastarResponse, createDatastarFlightRecorder } from "datastar-kit/testing"

const recorder = createDatastarFlightRecorder()

const response = await recorder.handle(request, async (request) => {
  const signals = await read.signals(request)
  return reply.signals({ count: Number(signals.count) + 1 })
})

recorder.assert().toHaveRequested({ method: "POST", signals: { count: 1 } })
recorder.assert().toHavePatchedSignals({ count: 2 })

await assertDatastarResponse(response).toHavePatchedSignals({ count: 2 })
console.log(recorder.format())
```

The recorder records `handler.error` events before rethrowing handler failures. Recorder response inspection is bounded by default (`timeoutMs: 1000`, `maxBytes: 1_000_000`) so long-lived streams do not hang tests; pass `inspectResponse: {}` to opt into unbounded inspection for a specific recorder.

`installDatastarFetchRecorder()` wraps a browser-like `fetch` target and records only requests with Datastar's `Datastar-Request` header by default, so unrelated network traffic does not pollute the flight.

For browser/runtime tests, use `datastar-kit/testing/node` to serve any fetch-compatible app on an ephemeral local server. The fixture wraps your real app handler, injects the browser recorder into HTML pages, and exposes both server and browser flights:

```ts
import { chromium } from "playwright"
import {
  createDatastarBrowserTestServer,
  waitForDatastarBrowserRecorder
} from "datastar-kit/testing/node"
import { app } from "./app"

const fixture = await createDatastarBrowserTestServer({
  fetch: (request) => app.fetch(request)
})
const browser = await chromium.launch()
const page = await browser.newPage()

try {
  await page.goto(fixture.url)
  await waitForDatastarBrowserRecorder(page)
  await page.getByRole("button", { name: "Add todo" }).click()

  const flight = await fixture.assert(page)
  fixture.recorder.assert().toHavePatchedSignals({ count: 2 })
  flight.toHaveBrowserUserEvent({
    event: "click",
    expression: /post/
  })
} finally {
  await browser.close()
  await fixture.close()
}
```

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
