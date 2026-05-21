# Runtime boundaries

Datastar Kit composes inside ordinary fetch-compatible handlers. The package owns Datastar-specific authoring and response details; your app owns the rest of the request lifecycle.

```ts
const form = await read.signals(request, FormSchema)
await store.save(form)
return reply.done()
```

## SDK surface

Use Datastar Kit for:

- Datastar attributes, actions, expressions, modifiers, and signal refs through `ds`.
- Server HTML nodes, JSX runtime glue, escaping, prop merging, and `renderToString(...)`.
- Datastar signal decoding from native `Request` values through `read`.
- Native `Response` helpers for pages, patches, streams, navigation, and command completion through `reply`.
- SSE event chunks through `event`, plus low-level `datastar-kit/sse` encoders for protocol tests or custom integrations.

## App integration points

Keep these concerns in your framework, platform, or app-owned services:

- routing and middleware;
- authentication, sessions, CSRF, and rate limits;
- databases, stores, queues, caches, and broker subscriptions;
- request-local app context;
- deployment adapters and process lifecycle;
- logging, tracing, metrics, and OpenTelemetry setup.

## Request boundary

Use `read.signals(request)` when the request is a Datastar action carrying JSON signal state. Add a Standard Schema validator when the handler needs a typed and checked payload:

```ts
const state = await read.signals(request)
const payload = await read.signals(request, FormSchema)
```

Use `new URL(request.url)`, `request.formData()`, `request.json()`, framework middleware, or specialized multipart parsers for other HTTP concerns.

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
