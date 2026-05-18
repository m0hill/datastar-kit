# Request lifecycle and security boundaries

Server-driven UI still has normal web security requirements. Datastar signals, query params, forms, cookies, headers, and request bodies are all user-controlled input.

## Request lifecycle

1. Request enters the Effect Platform router.
2. `requestRuntimeLayer()` derives `RequestContext`.
3. Security/session/auth checks run.
4. Signals/query/form/body data are decoded with Effect Schema at the boundary.
5. User/domain handler runs with typed services.
6. Typed errors are mapped by `ErrorMapper`.
7. Response is finalized.
8. Request/stream scopes release resources on completion, abort, or disconnect.

## Untrusted signals

Signals are never trusted state. Schema decoding proves shape, not authority. Handlers must still check authorization, ownership, and domain invariants on the backend.

Do not put secrets, session data, authorization decisions, or large uploads in signals. Prefer forms/multipart for file uploads.

## CSRF

Datastar write actions are normal browser requests. Use CSRF protection for `POST`, `PUT`, `PATCH`, and `DELETE`.

`requireCsrfToken(expected, { headerName })` checks `x-csrf-token` by default and skips safe methods unless configured otherwise. It is intentionally an integration hook: applications decide how to generate/store the expected token, usually through a session service.

```ts
const save = catchMappedErrors(
  requireCsrfToken(session.csrf).pipe(
    Effect.andThen(saveCommand)
  )
)
```

## Sessions and auth

Auth/session data should flow through Effect context, not globals. `AuthContext` is a minimal service shape for examples/integration:

```ts
const user = yield* requireUser<User>()
```

Real apps can replace this with richer services/layers for sessions, users, permissions, and tenant context.

## Request size/body limits

Set body limits before reading request bodies:

- `requireContentLengthAtMost(bytes)` rejects oversized `Content-Length` headers.
- `readLimitedText(bytes)` checks the header first, reads text, then verifies actual UTF-8 byte length.

Multipart parsing should also be configured with Effect Platform multipart limits at the runtime edge. `ts-star` does not encourage base64 file uploads through signals.

## Abort/cancellation

`requestAbortSignal` exposes the Web `AbortSignal` when the underlying request has one. Long-running handlers should compose with Effect interruption and stream scopes; live query streams and PubSub subscriptions are scoped so disconnects can clean up.

## Safe navigation

If an app emits navigation scripts, validate the target first:

- `safeRedirectUrl(url, options)` rejects control characters, `javascript:` URLs, and external origins by default.
- `navigationScript(url, options)` creates a simple `window.location.href = ...` script after validation.

Do not generate script responses from untrusted URLs without validation.

## Default error mapping

The runtime error mapper handles security errors:

- `CsrfError` → `403 CSRF check failed`
- `UnauthorizedError` → `401 Unauthorized`
- `RequestSizeLimitError` → `413 Request body too large`
- `UnsafeRedirectUrlError` → `400 Unsafe redirect URL`

Applications can override `ErrorMapper` to return Datastar validation patches instead of plain text where appropriate.
