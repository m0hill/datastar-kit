# T004 — Remove the public Runtime service catalog

## Status

`pending`

## Grill level

`5/5` — identity-defining decision.

## Why this task exists

`src/runtime.ts` wraps many pure or already-simple operations in Effect services:

- config service;
- HTML renderer service;
- Datastar protocol service;
- request context service;
- signal decoder service;
- error mapper service;
- live query hub service.

This creates an enterprise-style service catalog before the framework has earned it. It also duplicates `Platform`, `Model`, and `Realtime` concepts.

## Recommended answer

Remove `Runtime` from public API. Keep Effect where it naturally helps:

- application services like databases/stores;
- resource scoping;
- request decoding effects;
- typed failures at boundaries;
- streams and PubSub.

Do not wrap rendering and response constructors in services yet.

## Grill question before implementation

Should `Runtime` be deleted outright or moved to `src/internal/experimental-runtime.ts` while examples stop using it?

Recommended answer: delete or internalize it; do not expose it from the package root.

## Implementation work

- Remove `Runtime` namespace from root exports.
- Delete or internalize thin services.
- Rewrite `examples/runtime-counter.ts` to the normal platform/model path, or remove it if it only demonstrates runtime ceremony.
- Replace `SignalDecoder` usage with direct `Platform.readSignals(schema)` calls.
- Replace `DatastarProtocol` usage with canonical response helpers from T003.
- Remove `ErrorMapper` unless a simple recipe is retained outside core.
- Remove `LiveQueryHub` in favor of direct Effect `PubSub`/`Stream` or `Model.liveQuery`.

## Acceptance criteria

- The simplest example does not require framework-provided services/layers.
- Public API no longer contains a generic runtime service catalog.
- Effect usage remains visible where it adds value.
- Tests pass without `requestRuntimeLayer` as a public concept.

## Anti-goals

- Do not replace `Runtime` with another equally generic service layer.
- Do not keep aliases for the old services.
- Do not remove Effect from places where it genuinely simplifies streams/resources/errors.
