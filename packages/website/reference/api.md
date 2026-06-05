# API reference

Datastar Kit exposes a small root API plus explicit subpaths for low-level protocol and JSX runtime integration.

Most application code imports contextual namespaces:

```tsx
import { ds, event, read, reply } from "datastar-kit"
```

TSX consumers should also set:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "datastar-kit"
  }
}
```

## `ds`

`ds` contains helpers for action expressions, signal refs, typed signal state, and expression serialization. Write Datastar attributes directly in TSX with native `data-*` names.

### State and signals

| API                  | Use                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `ds.state(defaults)` | Create typed signal refs, defaults, partial patches, and reset payloads from one object. |
| `ds.signal(name)`    | Create a standalone typed signal ref.                                                    |
| `ds.local(name)`     | Create an underscore-prefixed local/private signal ref.                                  |

### Actions

| API                         | Use                                                        |
| --------------------------- | ---------------------------------------------------------- |
| `ds.get(url, options?)`     | Build `@get(...)`.                                         |
| `ds.post(url, options?)`    | Build `@post(...)`.                                        |
| `ds.put(url, options?)`     | Build `@put(...)`.                                         |
| `ds.patch(url, options?)`   | Build `@patch(...)`.                                       |
| `ds.delete(url, options?)`  | Build `@delete(...)`.                                      |
| `ds.queryUrl(path, params)` | Build a reactive URL expression with encoded query params. |
| `ds.action(name, ...args)`  | Call an app-defined or Datastar built-in browser action.   |
| `ds.set(signal, value)`     | Build a signal assignment expression.                      |

Fetch action options include `headers`, `contentType`, `filterSignals`, `payload`, retry settings, request cancellation behavior, and direct-response overrides.

### Datastar attributes in TSX

Use native Datastar attributes directly:

```tsx
<form
  data-signals={[form.defaults, { ifMissing: true }]}
  data-on:submit={[ds.post("/signup"), { prevent: true }]}
>
  <input data-bind={form.$.email} />
  <small data-show={form.$.errors.email} data-text={form.$.errors.email} />
</form>
```

When a Datastar attribute needs modifiers, pass `[value, modifiers]`:

```tsx
<input data-on:input={[ds.get("/search"), { debounce: "200ms" }]} />
```

### Expressions

| API                       | Use                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `ds.expr`                 | Tagged template for Datastar expressions with safe serialization of refs and literals. |
| `ds.regex(...)`           | Build a regular expression expression value.                                           |
| `ds.RegexExpressionError` | Thrown when regex pattern or flags cannot create a `RegExp`.                           |

## `read`

`read` contains request-boundary helpers.

| API                     | Use                                                           |
| ----------------------- | ------------------------------------------------------------- |
| `read.signals(request)` | Decode Datastar JSON signal state from a native `Request`.    |
| `read.SignalParseError` | Thrown when signal payload JSON cannot be parsed.             |
| `read.SignalShapeError` | Thrown when parsed signals are not a JSON object signal tree. |

`GET` and `DELETE` actions read the `datastar` query parameter. Other methods read the request body as JSON.

## `reply`

`reply` returns native `Response` objects.

| API                                           | Status         | Use                                                                                  |
| --------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `reply.page(body, options?, init?)`           | caller-defined | Render a full HTML document.                                                         |
| `reply.patch(elements, options?, init?)`      | `200`          | Return one SSE element patch.                                                        |
| `reply.signals(value, options?, init?)`       | `200`          | Return one SSE signal patch.                                                         |
| `reply.stream(events, options?, init?)`       | `200`          | Return an SSE stream from chunks, iterables, async iterables, or a `ReadableStream`. |
| `reply.done(init?)`                           | `204`          | Complete a command with no body.                                                     |
| `reply.navigate(url, options?, init?)`        | `200`          | Navigate through a safe Datastar direct script response.                             |
| `reply.directHtml(html, options?, init?)`     | `200`          | Direct-response HTML escape hatch.                                                   |
| `reply.directSignals(value, options?, init?)` | `200`          | Direct-response JSON signal escape hatch.                                            |
| `reply.directScript(script, options?, init?)` | `200`          | Trusted direct-response JavaScript escape hatch.                                     |

Datastar action response helpers own their protocol status codes, so their native `init` type does not accept `status` or `statusText`. Use `reply.page(...)` or a plain `Response` for ordinary HTTP status semantics.

`reply.NavigationUrlError` is thrown when navigation URLs are malformed, unsafe, or disallowed by the provided navigation options.

## `event`

`event` returns framed SSE chunks for `reply.stream(...)`.

| API                               | Use                                                         |
| --------------------------------- | ----------------------------------------------------------- |
| `event.patch(elements, options?)` | Render HTML and encode one `datastar-patch-elements` event. |
| `event.signals(value, options?)`  | Encode one `datastar-patch-signals` event.                  |
| `event.navigate(url, options?)`   | Encode a safe navigation event.                             |
| `event.script(code, options?)`    | Encode trusted JavaScript execution.                        |

Use `event.*` when one response needs multiple events or a long-lived stream.

## HTML helpers

| API                    | Use                                               |
| ---------------------- | ------------------------------------------------- |
| `renderToString(node)` | Serialize Datastar Kit HTML nodes and TSX output. |
| `unsafeHtml(html)`     | Mark trusted HTML as already safe.                |

Types exported from the root include `HtmlChild`, `HtmlNode`, `HtmlProps`, `HtmlPropValue`, `SignalState`, and `SignalValue`.

## Explicit subpaths

| Subpath                        | Use                                                                         |
| ------------------------------ | --------------------------------------------------------------------------- |
| `datastar-kit/sse`             | Low-level Datastar SSE encoders for protocol tests and custom integrations. |
| `datastar-kit/jsx-runtime`     | TypeScript automatic JSX runtime entrypoint.                                |
| `datastar-kit/jsx-dev-runtime` | TypeScript automatic JSX development runtime entrypoint.                    |

Related guides: [Actions and responses](../guides/actions-and-responses.md), [Signals](../guides/signals.md), [HTML and JSX](../guides/html-and-jsx.md).
