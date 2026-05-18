# Validation and error UX

Recoverable user-facing errors should usually be returned as successful Datastar responses so the browser runtime applies the UI update. Do not rely on `400`/`422` response bodies to patch the page.

## Categories

- **Validation errors** — user input is syntactically valid enough to understand, but fails form/domain validation. Return `200` Datastar patches near the relevant fields.
- **Domain/action errors** — the action cannot complete (stale version, cannot delete last owner, etc.). Return a predictable UI patch or a mapped status depending on whether the current Datastar action should update the UI.
- **Decode errors** — malformed JSON signals, schema failures, invalid query params. These are typed and can map to `400` unless a handler deliberately converts them to UI patches.
- **Fatal errors** — unexpected defects should log/trace internally and return safe generic responses, not stack traces.

## Validation signal convention

`src/validation.ts` uses `_validation` signals by default:

```json
{
  "_validation": {
    "form": "Please fix the highlighted fields",
    "email": "Email is invalid"
  }
}
```

This follows the signal policy: validation state is local UI state and `_validation.*` is excluded from default Datastar requests.

Helpers:

- `FormValidationError(issues, message)` — typed recoverable validation error.
- `validationSignalPayload(error)` — JSON signal patch payload.
- `validationSignalsResponse(error)` — `200` Datastar signal patch response.
- `clearValidationSignalPayload(...fields)` / `clearValidationSignalsResponse(fields)` — `null` removal semantics.
- `validationSummaryResponse(error)` — element patch for a summary region.

## Domain/action errors

`ActionError` represents a recoverable domain/action failure. Use `actionErrorResponse(error)` to patch `#action-error` by default, or pass a selector for another region.

## Reference form

`examples/validation-form.ts` demonstrates:

- schema-derived input signals via `defineSignals`;
- `_validation.form`, `_validation.name`, and `_validation.email` signals;
- recoverable validation failures returned as `200` Datastar signal patches;
- malformed input/schema decode failures mapped to `400 Invalid request input`;
- successful submissions returned as element patches.

## Error mapper role

`ErrorMapper` remains the final boundary for errors that are not intentionally recovered by a handler. Form validation is commonly recovered inside the action so Datastar can patch the UI. Decode/security/fatal errors can continue through `catchMappedErrors` to status responses.

Applications can provide a custom mapper if they want schema decode failures to render a form-level patch instead of a plain `400`.
