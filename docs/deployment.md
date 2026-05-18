# Deployment guide

`ts-star` currently targets Node through Effect Platform. The package stays server-driven: static assets are small, and most behavior is ordinary HTTP routes.

See also [`performance-deployment.md`](performance-deployment.md) for compression, reverse proxy, caching, SSE scaling, and smoke-test guidance.

## Build

```sh
pnpm run build
```

The build compiles TypeScript and copies the pinned Datastar client to `dist/vendor/datastar.js`.

## Run examples

```sh
pnpm run dev:counter
PORT=4000 pnpm run dev:validation-form
```

The dev server serves `/datastar.js` with no-cache headers. Production apps can use `Client.datastarClientFileRoute`, a CDN script tag, or an app-owned static file route.

## Runtime configuration

Use Effect layers for app-owned dependencies:

- security/session/auth services;
- domain repositories;
- realtime notification streams;
- error mapping;
- telemetry/tracing.

`ts-star` does not provide a runtime service catalog. App code composes ordinary Effect services with `read.signals`, `reply.*`, and `live.query(...)`.

## HTTP concerns

Production adapters should set normal platform concerns outside framework helpers:

- TLS/proxy headers;
- compression where appropriate;
- cache-control for static assets;
- request body limits before and after reading;
- graceful shutdown and scoped resource cleanup;
- logs/traces/metrics through Effect tracing/OpenTelemetry or your platform tooling.

## Datastar asset policy

Pin the Datastar version you test against. Avoid silently floating production pages to an untested client runtime. Use `cacheControl` and custom `headers` on `Client.datastarClientResponse`, `datastarClientRoute`, or `datastarClientFileRoute` to choose no-cache development behavior, fingerprinted immutable production assets, or validation headers for stable URLs.
