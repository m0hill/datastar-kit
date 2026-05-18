# Effect-native runtime

`ts-star` runtime APIs should be natural Effect programs: handlers may require services in their context, applications assemble those services with `Layer`s, request-scoped services are derived per request, and framework errors stay typed until an error mapper turns them into responses.

This direction follows the shape used by the Effect repository examples (`packages/platform-node/examples/http-router.ts`, `http-tag-router.ts`, and `api.ts`): route handlers remain `Effect`s, domain capabilities are services, and concrete runtime wiring happens at the edge with layers.

## Runtime services

`src/runtime.ts` introduces the smallest useful service set:

- `TsStarConfig` — framework defaults such as the Datastar script path and runtime mode.
- `DatastarProtocol` — service-backed constructors for Datastar page, element patch, signal patch, and no-content responses.
- `RequestContext` — current Effect Platform request, parsed URL, method, Datastar request flag, and raw signal body/query effect.
- `SignalDecoder` — schema-based signal decoding derived from `RequestContext`.
- `ErrorMapper` — maps typed framework/domain errors to HTTP responses.
- `LiveQueryHub` — scoped invalidation PubSub for current-state live queries.

These services supplement the existing low-level helpers; they do not hide Effect behind promises or erase handler context types.

## Layering

Use `runtimeCoreLayer()` for services that are not request-scoped:

```ts
const program = Effect.gen(function* () {
  const protocol = yield* DatastarProtocol
  return yield* protocol.noContent()
}).pipe(Effect.provide(runtimeCoreLayer()))
```

Use `requestRuntimeLayer()` inside route handlers that need request-derived services such as `RequestContext` or `SignalDecoder`:

```ts
const handler = catchMappedErrors(
  Effect.gen(function* () {
    const decoder = yield* SignalDecoder
    const signals = yield* decoder.decode(MySignals)
    // mutate backend state...
    return yield* (yield* DatastarProtocol).patchSignals({ count: signals.count + 1 })
  })
).pipe(Effect.provide(requestRuntimeLayer(), { local: true }))
```

The `{ local: true }` option is intentional for request-scoped layers so a fresh `RequestContext` is derived for each request. Domain layers such as stores and live-query hubs should usually be provided separately at app scope.

## Request lifecycle

The intended lifecycle is:

1. Request enters the Effect Platform router.
2. `requestRuntimeLayer()` derives `RequestContext` from `HttpServerRequest`.
3. Security/session/auth hooks can run once those services exist.
4. Signals/query/body/form data are decoded at the boundary.
5. User handlers run with typed service requirements.
6. Typed errors are handled by `catchMappedErrors` / `ErrorMapper`.
7. A Web/Datastar response is finalized.
8. Request scopes close; streaming resources remain tied to their stream/layer scopes and are released on shutdown or cancellation.

## Error mapping

Framework code should prefer typed error channels over throws. The default mapper handles:

- `SignalJsonError` → `400 Invalid Datastar signals`
- `Schema.SchemaError` → `400 Invalid request input`
- `ValidationError` → `400 <message>`
- `DatastarResponseStatusError` → `500 Invalid Datastar response status`
- unknown errors → `500 Internal Server Error`

Applications can provide a custom `ErrorMapper` layer to return Datastar patches for validation UX instead of plain text responses.

## Live query hub lifecycle

`LiveQueryHubLive()` creates a scoped PubSub. Closing the layer scope shuts down the PubSub, and streams created with `hub.invalidations` use Effect Stream/PubSub subscription scopes. Use the hub as an invalidation source, not as authoritative state.

## Example

`examples/runtime-counter.ts` is the first Effect-native runtime example:

- `CounterStore` is a domain service backed by an Effect `Ref`.
- The app is wired with `CounterStoreLive` plus `requestRuntimeLayer()`.
- Handlers require `DatastarProtocol`, `SignalDecoder`, and `CounterStore` in their Effect context.
- Missing service provision is visible in the handler type and covered by compile-time tests.

This keeps the framework close to idiomatic Effect while leaving larger application containers and tag-router DSLs for future tasks.
