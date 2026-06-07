# datastar-kit

`datastar-kit` is a small TypeScript SDK for building server-driven UI with [Datastar](https://data-star.dev/).

It provides typed helpers for Datastar actions, expressions, and signal refs; native Datastar attributes in server-rendered TSX; signal payload reads from `Request`; and native `Response` helpers for Datastar pages, patches, streams, navigation, and command completion.

It is not a framework. Bring your router, auth, database, validation, sessions, and runtime.

[Documentation](https://datastar-kit.mohil.dev) · [GitHub](https://github.com/m0hill/datastar-kit) · [Datastar](https://data-star.dev/)

## Install

```sh
npm i datastar-kit
```

Datastar Kit does not bundle, install, or serve the Datastar browser runtime. This release is written and tested against Datastar `v1.0.2`; use a pinned runtime URL or a self-hosted compatible copy.

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"
></script>
```

For TSX views, set `jsxImportSource`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "datastar-kit"
  }
}
```

## Example

```tsx
import { post, reply } from "datastar-kit"

const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"

let count = 0

const Counter = () => (
  <main>
    <button
      type="button"
      data-on:click={post("/increment")}
    >
      Increment
    </button>
    <output id="count">{count}</output>
  </main>
)

export function handle(request: Request): Response {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    return reply.page(<Counter />, {
      title: "Counter",
      head: (
        <script
          type="module"
          src={DATASTAR_RUNTIME}
        />
      )
    })
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(<output id="count">{count}</output>)
  }

  return new Response("Not Found", { status: 404 })
}
```

The stable `id` is the patch contract. The server returns new HTML for `#count`; Datastar applies it in the browser.

## Flight Recorder

`datastar-kit/testing` exposes protocol-level testing helpers for debugging Datastar handlers without asserting raw SSE strings.

```ts
import { read, reply } from "datastar-kit"
import { assertDatastarResponse, createDatastarFlightRecorder } from "datastar-kit/testing"

const recorder = createDatastarFlightRecorder()

await recorder.handle(request, async (request) => {
  const signals = await read.signals(request)
  return reply.signals({ count: Number(signals.count) + 1 })
})

recorder.assert().toHaveRequested({ method: "POST", signals: { count: 1 } })
recorder.assert().toHavePatchedSignals({ count: 2 })

await assertDatastarResponse(reply.signals({ saved: true })).toHavePatchedSignals({ saved: true })

console.log(recorder.format())
```

The recorder clones requests and responses before inspection, so normal handler code and response body reads still work. Handler failures are recorded as `handler.error` events before being rethrown. Recorders also apply bounded response inspection by default (`timeoutMs: 1000`, `maxBytes: 1_000_000`) so long-lived streams do not hang tests; pass `inspectResponse: {}` to opt into unbounded inspection for a specific recorder.

`installDatastarFetchRecorder()` can also wrap `fetch` in browser-like tests; by default it records requests with Datastar's `Datastar-Request` header to avoid unrelated network noise.

For real browser debugging, `datastar-kit/testing/node` provides `createDatastarBrowserTestServer({ fetch: (request) => app.fetch(request) })`. It starts an ephemeral local server, wraps your real fetch-compatible app with server-side recording, injects the browser recorder into HTML pages, and lets tests read browser flights with `fixture.browserFlight(page)`.

See [datastar-kit.mohil.dev](https://datastar-kit.mohil.dev) for guides, API reference, and examples.

## License

[MIT](LICENSE) © Mohil
