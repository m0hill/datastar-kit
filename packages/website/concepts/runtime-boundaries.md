# Runtime boundaries

Datastar Kit composes inside ordinary fetch-compatible handlers. Use the SDK helpers for Datastar-specific HTML, signal, event, and response work, then connect those helpers to your app's routing, services, and deployment setup.

```ts
const input = await read.signals(request, FormSchema)
await store.save(input)
return reply.done()
```

## SDK surface

- Datastar attribute/action/signal helpers through `ds`.
- Server HTML nodes, JSX runtime glue, escaping, and `renderToString(...)`.
- Datastar signal decoding from native `Request` values.
- Datastar-compatible `Response` helpers through `reply`.
- SSE event chunk helpers through `event` and low-level `datastar-kit/sse` encoders.

## App integration points

Use your application framework or platform code for domain/runtime capabilities:

- routing and middleware;
- authentication, sessions, CSRF, and rate limits;
- databases, stores, queues, caches, and broker subscriptions;
- request-local app context;
- deployment adapters and process lifecycle;
- logging, tracing, metrics, and OpenTelemetry setup.

## Request boundary

Use `read.signals(request)` for schema-free Datastar signal decoding with a JSON object shape check, or `read.signals(request, schema)` when a Standard Schema validator should check the payload. Use `new URL(request.url)`, `request.formData()`, `request.json()`, framework middleware, or specialized multipart parsers for other HTTP concerns.

Handle expected errors locally when they should produce Datastar UI feedback. Use app-level middleware for generic decode/security/fatal failures.

## Responses

Use `reply.*` for Datastar response construction and `event.*` for individual SSE chunks in streams:

```ts
return reply.page(view)
return reply.patch(view)
return reply.signals({ saved: true })
return reply.stream([event.patch(view)])
return reply.stream(events, { heartbeat: { intervalMs: 15_000 } })
return reply.navigate('/dashboard')
return reply.done()
```

Next: [HTML and JSX](../guides/html-and-jsx.md). Related: [Security](../guides/security.md), [Architecture](../reference/architecture.md).
