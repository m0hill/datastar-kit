# Signal policy and scoping

Datastar signals are useful browser-side state, but they are not the application database. In `ts-star`, durable/domain state should live on the backend and the UI should be recoverable by rerendering current backend state.

## Use signals for

- user input state (`inputSignal`);
- small request parameters sent to commands;
- local disclosure/menu/dialog state (`privateSignal` / `localSignal`);
- validation and error messages (`validationSignal`);
- loading/indicator flags (`loadingSignal`);
- temporary browser state that can be recreated from a server render.

## Do not use signals for

- primary persisted application records;
- large client-side models mirrored from the database;
- sensitive secrets or credentials;
- authorization/session state;
- any state that must survive reconnects without the backend.

Signals are visible to browser JavaScript and can be sent back to the server. Treat them as untrusted input.

## Backend source of truth

Commands should mutate backend state, then either:

- return `204` and let a live/current query rerender; or
- return an element patch/direct response for local feedback.

Prefer element patches from server-rendered current state for primary app state. Use signal patches for form reset, validation messages, loading flags, and other small UI affordances.

## `ifMissing`

Use `data-signals__ifmissing` when markup initializes client-owned state but should not overwrite user edits during morphs:

```ts
h("form", dataSignals({ q: "" }, { ifMissing: true }))
```

This is appropriate for input defaults and local UI flags. Avoid repeatedly pushing backend state into client signals as the default update mechanism.

## Helper conventions

`src/datastar.ts` includes small naming helpers that make intent visible:

- `inputSignal(name)` — a normal signal expected to be posted as request input.
- `privateSignal(name)` / `localSignal(name)` — prefixes `_` so Datastar excludes it from default backend requests.
- `validationSignal(name)` — creates `_validation.<name>`.
- `loadingSignal(name)` — creates `_loading.<name>`.
- `privateDataSignal`, `validationDataSignal`, `loadingDataSignal` — initialize those scoped signals.

Example local disclosure state:

```ts
const open = localSignal<boolean, "menuOpen">("menuOpen")

h(
  "details",
  privateDataSignal("menuOpen", false, { ifMissing: true }),
  h("summary", {}, "Menu"),
  h("div", show(open), "Panel")
)
```

## Naming and casing

Signal names must be simple Datastar paths:

- valid: `count`, `form.email`, `_menuOpen`, `_validation.email`;
- invalid: `first-name`, `1count`, `form..email`.

Use Datastar case modifiers only when interoperating with existing markup that requires them. Prefer canonical camelCase or snake_case signal names in TypeScript so generated signal handles, schema keys, and request payloads stay aligned.

## Sensitive data warning

Never put passwords, tokens, API keys, private session data, or authorization decisions in signals. Private/local signals only control Datastar's default request filtering; they are still browser-side data and are not secret.

## Examples

- `examples/counter.ts` and `examples/tsx-counter.tsx` keep count on the backend and patch the rendered `<output>` element.
- `examples/live-counter.ts` renders current backend state on stream connect and after invalidation.
- `examples/search.ts` uses a `q` signal as user input for a query, which is an appropriate signal use.
- `test/signal-policy.test.ts` demonstrates private/local, validation, and loading signal helpers.
