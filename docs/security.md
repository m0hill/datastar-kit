# Security boundaries

Server-driven UI still has normal web security requirements. Datastar signals, query params, forms, cookies, headers, and request bodies are all user-controlled input.

`ts-star` does not provide a public auth/session/CSRF subsystem. Those policies belong to the application router, middleware, or app-owned Effect services.

## Request boundary

A typical handler should:

1. receive a request through the Effect Platform router;
2. decode signals/query/form/body input at the boundary with Effect Schema;
3. run app-owned auth/session/CSRF/permission checks where appropriate;
4. validate domain invariants against backend state;
5. return `reply.done()`, `reply.patch(...)`, `reply.signals(...)`, `reply.stream(...)`, or `reply.navigate(...)`.

Schema decoding proves shape, not authority. Handlers must still check ownership and permissions on the backend.

## Signals are untrusted

Do not put secrets, session data, authorization decisions, or large uploads in Datastar signals. Signals are sparse browser inputs and UI affordances, not trusted state.

Use signals for small values such as form fields, search strings, selected IDs, local loading state, or validation messages. Use normal request bodies/forms/multipart handling for larger or security-sensitive payloads.

## Auth, sessions, and CSRF

Applications should own these concerns explicitly:

- session parsing and user lookup through app services/layers;
- permission checks in command/query handlers;
- CSRF protection for unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`);
- request body size limits at the router/proxy/platform boundary.

Keep these policies near the HTTP boundary rather than hiding them behind `ts-star` helpers.

## Safe Datastar-driven navigation

Use `reply.navigate(url, options)` when an action should drive browser navigation through Datastar.

`reply.navigate(...)` returns a Datastar-safe `200 text/javascript` response after validating the target URL. The default policy is same-origin navigation relative to `baseUrl ?? "http://localhost"`; external destinations require an explicit `allowedOrigins` whitelist.

```ts
return reply.navigate("/dashboard")

return reply.navigate("https://docs.example/start", {
  baseUrl: "https://app.example",
  allowedOrigins: ["https://docs.example"]
})
```

Do not hand-roll navigation scripts from untrusted URLs.
