# Security boundaries

Datastar Kit does not provide a public auth/session/CSRF subsystem. Those policies belong to the application router, middleware, or app-owned services.

A safe Datastar command should:

1. receive a native `Request` through the application framework;
2. decode Datastar signals with `read.signals(request)`, optionally validate with `read.signals(request, schema)`, or use Web APIs/framework readers for other input;
3. check session, authorization, CSRF, and rate-limit policy in app code;
4. mutate backend state only after those checks pass;
5. return a Datastar patch for recoverable UI feedback or a normal HTTP response for non-Datastar clients.

Schema validation proves shape, not authority. Handlers must still check ownership and permissions on the backend.

Use `reply.navigate(...)` for Datastar-driven navigation so untrusted URLs are normalized and origin checked.
