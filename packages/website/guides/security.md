# Security

Datastar Kit does not provide auth, sessions, CSRF protection, ownership checks, or rate limiting. Those policies belong to the application router, middleware, or app-owned services.

A safe Datastar command should:

1. receive a native `Request` through the application framework;
2. decode Datastar signals with `read.signals(request)` and validate decoded input with app-owned schema code, or use Web APIs/framework readers for other input;
3. check session, authorization, CSRF, and rate-limit policy in app code;
4. mutate backend state only after those checks pass;
5. return a Datastar patch for recoverable UI feedback or a normal HTTP response for non-Datastar clients.

Schema validation proves shape, not authority. Handlers must still check ownership and permissions on the backend before changing state.

## Trust boundaries

- Use `unsafeHtml(...)` only for trusted or sanitized HTML.
- Use `reply.directScript(...)` only for trusted script text.
- Prefer `reply.navigate(...)` or `event.navigate(...)` for Datastar-driven navigation so untrusted URLs are normalized and origin checked.
- Treat browser signals as user input, not as durable state or authority.

Next: [Deployment](deployment.md). Related: [Validation and errors](validation-and-errors.md), [Actions and responses](actions-and-responses.md).
