# T014 — Prepare performance and deployment story

## Status

`pending`

## Why this task exists

Backend-driven Datastar apps can be very efficient, especially with fat morphs and compressed SSE streams. But the framework must document and test the deployment assumptions.

Performance should not be optimized prematurely, but production constraints should be understood before the framework API is stabilized.

## Target outcome

Provide a practical deployment and performance guide for `ts-star` apps.

## Areas to cover

### Compression

Datastar encourages sending HTML over SSE. Large repeated HTML compresses extremely well. Document:

- gzip/Brotli recommendations;
- reverse proxy behavior;
- streaming compression caveats;
- when compression middleware may buffer too much.

### Reverse proxy and HTTP versions

SSE works over normal HTTP but benefits from proper proxy configuration. Document:

- keep-alive behavior;
- buffering disabled for event streams;
- timeouts;
- HTTP/2/HTTP/3 considerations.

### Datastar client asset

Current self-hosting support is good. Add guidance for:

- pinned vendored asset;
- cache-control strategy;
- versioning/fingerprinting;
- CDN option;
- source map decision.

### Stream scalability

Document:

- one SSE connection per live view pattern;
- heartbeat intervals;
- backpressure;
- maximum client considerations;
- broker choices outside core.

### Rendering cost

Fat morph is simpler, but rendering can be expensive. Later optimizations can include:

- batching invalidations;
- work sharing for shared views;
- render caching;
- partial patches for hot paths.

Do not build these before the programming model is stable.

## Implementation work

- Add deployment checklist.
- Add performance notes to realtime docs.
- Add configurable client asset cache headers.
- Add benchmark or smoke test only after reference examples exist.
- Document proxy settings for common deployments.

## Acceptance criteria

- A user can deploy behind a reverse proxy without breaking SSE.
- Client asset caching is intentional.
- Compression recommendations are clear.
- Live stream scaling limits are documented honestly.
- Performance advice reinforces simplicity-first architecture.

## Anti-goals

- Do not optimize before architecture is stable.
- Do not require a specific proxy or host.
- Do not promise LiveView-style diffing or websocket-scale semantics.
