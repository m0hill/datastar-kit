# Signals

Datastar signals are browser-side values. Use them for sparse input and local UI feedback: form fields, filters, loading state, temporary messages, and validation text.

Do not treat signals as durable application state. Decode and validate them at the request boundary, then read trusted data from backend resources when authority matters.

## Start with `ds.state`

For a related group of signals, define the defaults once:

```tsx
import { ds } from "datastar-kit"

const signup = ds.state({
  name: "",
  email: "",
  errors: {
    email: ""
  }
})
```

`ds.state(...)` gives you four useful things:

| API                        | Use                                                      |
| -------------------------- | -------------------------------------------------------- |
| `signup.defaults`          | Initial signal values for `data-signals`.                |
| `signup.$` / `signup.refs` | Typed nested signal refs for attributes and expressions. |
| `signup.patch(...)`        | Type-checked partial signal patches.                     |
| `signup.reset(...)`        | Defaults, optionally merged with overrides.              |

Use those refs in Datastar attributes:

```tsx
const SignupForm = () => (
  <form data-signals__ifmissing={signup.defaults} data-on:submit__prevent={ds.post("/signup")}>
    <label>
      Name
      <input name="name" data-bind={signup.$.name} />
    </label>

    <label>
      Email
      <input name="email" data-bind={signup.$.email} />
    </label>

    <small data-text={signup.$.errors.email} />
  </form>
)
```

Use `data-signals__ifmissing={state.defaults}` for missing-only initialization. That keeps
reconnects and partial page updates from overwriting existing browser input unless you opt into that
behavior.

## Patch signal state

Return signal patches for small browser-side state changes:

```ts
return reply.signals(signup.patch({ errors: { email: "Enter a valid email" } }))
```

Reset a form back to defaults:

```ts
return reply.signals(signup.reset())
```

Signal patches are best for messages, validation, toggles, and UI flags. If visible HTML depends on backend state, render HTML and use `reply.patch(...)`.

## Standalone signals

Use `ds.signal(...)` when you only need one signal ref or when the signal name is not part of a grouped state helper:

```tsx
const query = ds.signal<string>("query")

<input type="search" data-bind={query} />
```

Use `ds.local(...)` for underscore-prefixed local/private signal refs:

```tsx
const saving = ds.local<boolean>("saving")

<button data-attr:disabled={saving}>Save</button>
```

Standalone refs can initialize their own signal value:

```tsx
<div data-signals:_saving__ifmissing={false} />
```

Private names are a convention, not a security boundary. The browser still controls browser state.

## Expressions

For anything beyond a bare signal ref, use `ds.expr` so signal refs and JavaScript literals are serialized consistently:

```tsx
const count = ds.signal<number>("count")

<button data-attr:disabled={ds.expr`${count} >= ${10}`}>+</button>
```

For common signal mutation in event handlers, use `ds.set(...)`:

```tsx
const open = ds.signal<boolean>("open")

<button data-on:click={ds.set(open, false)}>Close</button>
```

## Read signal payloads

Use `read.signals(request)` for Datastar action requests that carry JSON signal state:

```ts
import { read } from "datastar-kit"

const signals = await read.signals(request)
const input = FormSchema.parse(signals)
```

Datastar Kit decodes the transport and verifies that the payload is a JSON object signal tree. Your application still owns schema validation and domain validation.

`GET` and `DELETE` actions read the `datastar` query parameter. Other methods read the request body as JSON. For ordinary HTML forms, multipart uploads, and non-Datastar APIs, use platform or framework readers instead.

## Signal names

Pass Datastar signal names or refs as attribute values, not raw HTML attribute suffixes:

```tsx
<input data-bind="projectName" />
```

Datastar Kit renders case-preserving forms where needed because HTML attribute names are case-insensitive. Grouped initialization is usually simplest:

```tsx
<div data-signals={{ projectName: "", projectKey: "" }} />
```

If you write raw keyed Datastar attributes by hand, use Datastar's DOM-safe keyed spelling:

```html
<input data-bind:project-name />
```

Both bind the Datastar signal `$projectName`.

Next: [Actions and responses](actions-and-responses.md).
