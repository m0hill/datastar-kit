# Runtime boundaries in Web Standards applications

`ts-star` does not expose a public runtime service catalog. Normal handlers use explicit SDK helpers and app-owned services/resources:

```ts
const input = await read.signals(request, FormSchema)
await store.save(input)
return reply.done()
```

## App-owned services

Use your application framework or plain module code for domain capabilities:

- databases;
- stores;
- sessions;
- queues;
- caches;
- broker subscriptions;
- request-local app context.

`ts-star` should not wrap pure rendering, response construction, signal decoding, config, or live-query hubs in public runtime services.

## Request boundary

Use `read.signals(request, schema)` for Datastar signal decoding. Use `new URL(request.url)`, `request.formData()`, `request.json()`, framework middleware, or specialized multipart parsers for non-Datastar HTTP concerns.

Handle expected errors locally when they should produce Datastar UI feedback. Use app-level middleware for generic decode/security/fatal failures.

## Responses

Use `reply.*` for Datastar response construction:

```ts
return reply.page({ body: view })
return reply.patch(fragment, { selector: "#result" })
return reply.signals({ saved: true })
return reply.stream(events, { heartbeat: { intervalMs: 15_000 } })
return reply.navigate("/dashboard")
return reply.done()
```

## Live resources

Apps own invalidation resources directly. An in-memory set of subscribers, a database notification channel, Redis, NATS, or another broker can all adapt to an `AsyncIterable` of triggers and stream events with `reply.stream(...)`.
