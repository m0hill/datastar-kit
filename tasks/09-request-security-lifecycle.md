# T009 — Define request lifecycle, security, and boundaries

## Status

`done`

## Why this task exists

Server-driven UI does not remove normal web security requirements. Datastar signals are visible and user-modifiable. Every signal, query parameter, form value, and request body must be treated as untrusted input.

The framework needs an explicit request/security model before it is used for real apps.

## Target outcome

Define and implement secure request boundaries for:

- signal decoding;
- query decoding;
- form and multipart decoding;
- CSRF protection;
- sessions/cookies;
- auth context;
- request size limits;
- abort/cancellation propagation;
- safe redirects and script execution.

## Required design areas

### 1. Untrusted signals

Signals are not trusted state. Decoding with Effect Schema is necessary but not sufficient. Docs must state that authorization and business validation happen server-side.

### 2. CSRF

Datastar `@post`, `@put`, `@patch`, and `@delete` are normal browser requests. The framework should provide integration points for CSRF tokens, likely via headers or form fields.

Do not require a specific session implementation, but make the safe path obvious.

### 3. Sessions and auth

Define how handlers access authenticated user/session context through Effect services.

### 4. Form/multipart limits

File upload via signals can base64 data into JSON; multipart forms are often better. The framework should document and enforce size limits where possible.

### 5. Abort/cancellation

Datastar can cancel fetches. Effect handlers and streams should observe request cancellation where possible.

### 6. Safe navigation

If helpers are added for redirect/navigation through Datastar script patches, validate URLs to avoid `javascript:`/control-character problems.

## Implementation work

- Add request lifecycle design doc.
- Add security docs.
- Add typed request context service.
- Add CSRF hook or example integration.
- Add request size/body parsing policy.
- Add safe redirect/navigation helper if needed.
- Add tests for malformed signals, oversize inputs, and unsafe redirects.

## Acceptance criteria

- There is a documented safe default for write actions.
- Examples do not imply signals are trusted.
- Request decoding errors are typed and mappable.
- Auth/session data flows through Effect context, not globals.
- Long-running streams clean up on abort/disconnect.

## Anti-goals

- Do not build a full auth framework.
- Do not hide web security details from users.
- Do not encourage sensitive data in signals.
