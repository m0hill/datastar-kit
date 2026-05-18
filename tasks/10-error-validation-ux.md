# T010 — Design validation and error UX

## Status

`pending`

## Why this task exists

Real apps need a consistent way to handle validation failures, domain errors, authorization failures, and unexpected failures.

With Datastar, returning `400` with a body is usually not the right way to update UI, because the client runtime will not process it as a successful patch response. Recoverable UI errors should usually be returned as `200` Datastar patches, while fatal/unrecoverable errors can be normal HTTP errors.

## Target outcome

Define a typed error and validation model that maps cleanly to Datastar responses.

## Error categories

### Validation errors

Invalid user input should render error state near the relevant fields. This can be done with:

- element patches;
- signal patches for `field_err` style signals;
- both, depending on the form design.

### Domain/action errors

Examples: cannot delete item, stale version, permission denied for this operation. These should map to a predictable UI patch or status behavior.

### Decode errors

Malformed JSON signals, schema failures, invalid query params. These can be `400` if not expected to patch UI, or mapped into a controlled error patch in action handlers.

### Fatal errors

Unexpected defects should be logged/traced and return a safe generic response.

## Implementation work

- Define error ADTs/classes/tags.
- Add `ErrorMapper` service or equivalent.
- Add helpers for validation patches.
- Add a form example using Effect Schema and Datastar.
- Decide conventions for error signals, e.g. `_errors`, `fieldErrors`, or `form.errors`.
- Add tests for error-to-response mapping.

## Possible API sketch

```ts
const save = Command
  .signals(ProfileForm)
  .handle(({ signals }) => validate(signals).pipe(
    Effect.flatMap(saveProfile),
    Effect.catchTag("ValidationError", (error) =>
      Datastar.validationPatch(error)
    )
  ))
```

Exact syntax can change. The principle is typed recoverable errors mapped to patches.

## Acceptance criteria

- There is a reference form with validation errors.
- Recoverable validation failures do not rely on non-200 patch responses.
- Decode failures are visible and typed.
- Domain errors can be mapped without ad-hoc `Effect.result` everywhere.
- Tests cover success, validation failure, and malformed input.

## Anti-goals

- Do not invent a client-side validation framework.
- Do not rely on optimistic UI as the default.
- Do not expose raw stack traces to the browser.
