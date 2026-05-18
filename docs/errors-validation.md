# Validation and error UX

Recoverable user-facing errors should usually be returned as successful Datastar responses so the browser runtime applies the UI update. Do not rely on `400`/`422` response bodies to patch the page.

Validation is currently a **recipe**, not a public `ts-star` module. Define app-local error types and response helpers when you need them.

## Categories

- **Validation errors** — input is syntactically valid enough to understand, but fails form/domain validation. Return `200` Datastar patches near the relevant fields.
- **Domain/action errors** — the action cannot complete. Return a predictable UI patch if the current Datastar action should update the page, otherwise return an ordinary status response.
- **Decode errors** — malformed JSON signals, schema failures, invalid query params. These can map to `400` unless a handler deliberately converts them to UI patches.
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

This follows the signal policy: validation state is local UI state and `_validation.*` is excluded from default Datastar requests.

Example app-local helper:

```ts
type ValidationIssue<Field extends string> = {
  readonly field?: Field
  readonly message: string
}

class FormValidationError<Field extends string> extends Error {
  constructor(readonly issues: readonly ValidationIssue<Field>[], message = "Validation failed") {
    super(message)
  }
}

const validationPayload = <Field extends string>(error: FormValidationError<Field>) => {
  const validation: Record<string, string | null> = { form: error.message }
  for (const issue of error.issues) {
    validation[issue.field ?? "form"] = issue.message
  }
  return { _validation: validation }
}
```

Return the patch with core response primitives:

```ts
return reply.signals(validationPayload(error))
```

## Reference form

`examples/validation-form.ts` demonstrates:

- schema-derived input signals with `contract.signals(...)`;
- app-local validation errors and payload helpers;
- `_validation.form`, `_validation.name`, and `_validation.email` local signals;
- recoverable validation failures returned as `200` Datastar signal patches;
- malformed input/schema decode failures mapped to `400 Invalid request input`;
- successful submissions returned as element patches.

## Error handling posture

Keep expected validation/domain failures local to the handler so it is obvious which UI patch they produce. Use app-level middleware or Effect error handling for generic decode/security/fatal failures.
