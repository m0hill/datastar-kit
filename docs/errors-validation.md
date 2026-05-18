# Validation and error UX

Recoverable user-facing errors should usually be returned as successful Datastar responses so the browser runtime applies the UI update. Do not rely on non-200 response bodies to patch the page.

Validation is a recipe built from `read.signals(request, schema)`, app-local errors, local Datastar signals, and `reply.signals(...)` / `reply.patch(...)`.

## Categories

- **Validation errors** — input is syntactically valid enough to understand, but fails form/domain validation. Return `200` Datastar patches near the relevant fields.
- **Domain/action errors** — the action cannot complete. Return a predictable UI patch if the current Datastar action should update the page, otherwise return an ordinary status response.
- **Decode errors** — malformed JSON signals or Standard Schema failures. These can map to `400` unless a handler deliberately converts them to UI patches.
- **Fatal errors** — unexpected defects should be logged/traced by the app and return safe generic responses, not stack traces.

## Validation signal convention

A useful pattern is to keep recoverable validation feedback in local/private signals:

```json
{
  "_validation": {
    "form": "Please fix the highlighted fields",
    "email": "Email is invalid"
  }
}
```

Return the patch with core response primitives:

```ts
return reply.signals(validationPayload(error))
```

## Error handling posture

Keep expected validation/domain failures local to the handler so it is obvious which UI patch they produce. Use app-level middleware for generic decode/security/fatal failures.
