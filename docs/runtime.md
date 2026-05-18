# Effect in ts-star applications

`ts-star` does not expose a public runtime service catalog. Normal handlers use explicit framework helpers and ordinary app-owned Effect services:

```ts
const input = yield* read.signals(Form.schema)
const store = yield* ContactStore
yield* store.save(input)
return reply.done()
```

## App-owned services

Use Effect services/layers for domain capabilities:

- databases;
- stores;
- sessions;
- queues;
- caches;
- broker subscriptions;
- request-local app context when your app needs it.

`ts-star` should not wrap pure rendering, response construction, signal decoding, config, or live-query hubs in public framework services.

## Request boundary

Use `read.signals` for Datastar signal decoding:

```ts
const signals = yield* read.signals(Contact.schema)
```

`read.signals` handles both Datastar signal transports internally: GET/DELETE `?datastar=...` and body JSON for mutating methods.

Use Effect Platform directly for ordinary query params, forms, multipart bodies, and non-Datastar HTTP inputs.

Handle expected errors locally in the route when they should produce Datastar UI feedback. Use normal Effect error handling and normal Effect Platform responses for non-Datastar HTTP errors.

## Responses

Use `reply.*` for response construction:

```ts
return reply.page({ body: view })
return reply.patch(fragment, { selector: "#result" })
return reply.signals({ saved: true })
return reply.stream(events, { heartbeat: { interval: "15 seconds" } })
return reply.navigate("/dashboard")
return reply.done()
```

## Live-query resources

Apps own invalidation resources directly. For example, use Effect `PubSub` and adapt it to a stream:

```ts
const updates = yield* PubSub.sliding<void>(16)
const invalidations = Stream.fromPubSub(updates)

return reply.stream(live.query({ invalidations, load, render }))
```

Database notifications, Redis, NATS, or other brokers should follow the same pattern: adapt to an Effect `Stream` and pass that stream into `live.query`.

## Example

`examples/runtime-counter.ts` demonstrates ordinary app-owned Effect services with `ts-star` helpers. The point of the example is that Effect services compose naturally with `h`, `ds`, `read`, and `reply`; there is no ts-star runtime layer to provide.
