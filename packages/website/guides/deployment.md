# Deployment

Datastar Kit targets fetch-compatible JavaScript runtimes. The package stays server-driven: static assets are small, and most behavior is ordinary `Request -> Response` handling.

## Runtime adapters

Use your application framework or host adapter to connect handlers to the platform:

- Hono, custom fetch routers, Workers, Bun, Deno, Node, and similar environments can call Datastar Kit helpers directly.
- Standalone examples may include a small local Node adapter for development only.
- Core does not ship a Node server adapter or framework-specific integration.

## Datastar browser runtime

Datastar Kit does not bundle, install, or serve the Datastar browser runtime. This release is written and tested against Datastar `v1.0.1`; include a pinned CDN URL or serve your own compatible copy.

```ts
const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

reply.page(appShell, {
  head: h("script", { type: "module", src: DATASTAR_RUNTIME })
})
```

Serve pinned static assets with immutable caching when possible:

```http
cache-control: public, max-age=31536000, immutable
```

## Compression and SSE proxies

Use gzip or Brotli for ordinary HTML, CSS, JavaScript, and JSON responses when your platform supports it. Be careful with `text/event-stream`: compression can add buffering unless the platform flushes streaming chunks correctly.

For Nginx-style deployments, disable buffering for SSE locations:

```nginx
proxy_buffering off;
```

Keep proxy/read idle timeouts longer than your heartbeat interval. A live view usually means one SSE connection per browser tab or active view.

## App-owned dependencies

Databases, caches, sessions, queues, brokers, and request context belong to the application framework. Datastar Kit helpers are plain functions that compose inside those handlers.

Datastar Kit does not include a live broker. Redis, NATS, Postgres notifications, in-memory subscribers, or app-specific channels should adapt into `AsyncIterable`/`ReadableStream` event sources owned by the application.

## Production checklist

- configure proxy buffering and idle timeouts for SSE;
- set cache headers for static assets;
- enforce auth/session/CSRF/request size policy in app middleware;
- instrument logs/traces/metrics with your platform tooling;
- run a smoke test that exercises full-page responses, Datastar action patches, `204` command completion, and any live streams.

Next: [Testing](testing.md). Related: [Realtime streams](realtime.md), [Security](security.md).
