# Deployment guide

`ts-star` currently targets Node through Effect Platform. The package stays server-driven: static assets are small, and most behavior is ordinary HTTP routes.

See also [`performance-deployment.md`](performance-deployment.md) for compression, reverse proxy, caching, SSE scaling, and smoke-test guidance.

## Build

```sh
pnpm run build
```

The build compiles TypeScript. It does not copy or serve the Datastar browser runtime.

## Run examples

```sh
pnpm run dev:counter
PORT=4000 pnpm run dev:validation-form
```

The example dev server only serves the app. Examples include a versioned Datastar CDN script tag explicitly in the page head. Production apps should likewise choose either a pinned CDN URL or an app-owned static file route.

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

Pin the Datastar version you test against. `ts-star` does not expose client asset helpers or a framework-owned `/datastar.js` route. Add the runtime explicitly:

```ts
page({
  head: h("script", {
    type: "module",
    src: "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"
  }),
  body
})
```

If you self-host the file, serve it with your application or platform's normal static asset mechanism and cache headers.
