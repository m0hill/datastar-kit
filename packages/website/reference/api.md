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

`ds` contains helpers for writing Datastar attributes, action expressions, signal refs, expressions, and modifiers from TypeScript.

### State and signals

| API                                      | Use                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ds.state(defaults)`                     | Create typed signal refs, initial `data-signals` attrs, partial patches, and reset payloads from one object. |
| `ds.signal(name)`                        | Create a standalone typed signal ref.                                                                        |
| `ds.local(name)`                         | Create an underscore-prefixed local/private signal ref.                                                      |
| `ds.dataSignals(values, options?)`       | Render object-valued `data-signals`.                                                                         |
| `ds.dataSignal(name, value, modifiers?)` | Render one signal definition.                                                                                |
| `ds.jsonSignals(filter?, options?)`      | Render `data-json-signals`.                                                                                  |

### Actions

| API                                                   | Use                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `ds.get(url, options?)`                               | Build `@get(...)`.                                         |
| `ds.post(url, options?)`                              | Build `@post(...)`.                                        |
| `ds.put(url, options?)`                               | Build `@put(...)`.                                         |
| `ds.patch(url, options?)`                             | Build `@patch(...)`.                                       |
| `ds.delete(url, options?)`                            | Build `@delete(...)`.                                      |
| `ds.queryUrl(path, params)`                           | Build a reactive URL expression with encoded query params. |
| `ds.action(name, ...args)`                            | Call an app-defined Datastar browser action.               |
| `ds.peek(...)`, `ds.setAll(...)`, `ds.toggleAll(...)` | Build Datastar built-in action expressions.                |

Fetch action options include `headers`, `contentType`, `filterSignals`, `payload`, retry settings, request cancellation behavior, and direct-response overrides.

### Attributes

| API                                                          | Use                                           |
| ------------------------------------------------------------ | --------------------------------------------- |
| `ds.on(event, expression, modifiers?)`                       | Render `data-on:*`.                           |
| `ds.onIntersect(...)`, `ds.onInterval(...)`                  | Render lifecycle/event attributes.            |
| `ds.onSignalPatch(...)`, `ds.onSignalPatchFilter(...)`       | React to signal patches.                      |
| `ds.bind(signal, modifiers?)`                                | Render `data-bind`.                           |
| `ds.text(expression)`                                        | Render `data-text`.                           |
| `ds.show(expression)`                                        | Render `data-show`.                           |
| `ds.effect(expression)`                                      | Render `data-effect`.                         |
| `ds.init(expression, modifiers?)`                            | Render `data-init`.                           |
| `ds.ref(...)`, `ds.indicator(...)`                           | Render Datastar ref and indicator attributes. |
| `ds.dataAttr(...)`, `ds.dataAttrs(...)`                      | Render reactive DOM attributes.               |
| `ds.dataClass(...)`, `ds.dataClasses(...)`                   | Render reactive class bindings.               |
| `ds.dataStyle(...)`, `ds.dataStyles(...)`                    | Render reactive style bindings.               |
| `ds.dataComputed(...)`, `ds.dataComputeds(...)`              | Render computed signal definitions.           |
| `ds.ignore(...)`, `ds.ignoreMorph()`, `ds.preserveAttr(...)` | Control Datastar morphing behavior.           |

### Expressions

| API             | Use                                                                                    |
| --------------- | -------------------------------------------------------------------------------------- |
| `ds.expr`       | Tagged template for Datastar expressions with safe serialization of refs and literals. |
| `ds.regex(...)` | Build a regular expression expression value.                                           |

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

| API                          | Use                                               |
| ---------------------------- | ------------------------------------------------- |
| `h(tag, props, ...children)` | Low-level HTML node factory.                      |
| `mergeProps(...props)`       | Merge prop objects left-to-right.                 |
| `renderToString(node)`       | Serialize Datastar Kit HTML nodes and TSX output. |
| `unsafeHtml(html)`           | Mark trusted HTML as already safe.                |

Types exported from the root include `HtmlChild`, `HtmlNode`, `HtmlProps`, `HtmlPropValue`, `SignalState`, and `SignalValue`.

## Explicit subpaths

| Subpath                        | Use                                                                         |
| ------------------------------ | --------------------------------------------------------------------------- |
| `datastar-kit/sse`             | Low-level Datastar SSE encoders for protocol tests and custom integrations. |
| `datastar-kit/jsx-runtime`     | TypeScript automatic JSX runtime entrypoint.                                |
| `datastar-kit/jsx-dev-runtime` | TypeScript automatic JSX development runtime entrypoint.                    |

Related guides: [Actions and responses](../guides/actions-and-responses.md), [Signals](../guides/signals.md), [HTML and JSX](../guides/html-and-jsx.md).
