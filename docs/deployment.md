# Deployment

`ts-star` targets fetch-compatible JavaScript runtimes. The package stays server-driven: static assets are small, and most behavior is ordinary `Request -> Response` handlers.

## Runtime adapters

Use your application framework or host adapter to connect handlers to the platform:

- Hono, custom fetch routers, Workers, Bun, Deno, Node, and similar environments can call `handle(request)` directly.
- The example dev server includes a small local Node adapter for development only.
- Core does not ship a Node server adapter or framework-specific integration.

## Static assets

Datastar runtime inclusion is explicit HTML. Pin a CDN URL or serve your own copy:

```ts
reply.page({
  head: h("script", { type: "module", src: DATASTAR_CDN }),
  body: appShell
})
```

## App-owned dependencies

Databases, caches, sessions, queues, brokers, and request context belong to the application framework. `ts-star` helpers are plain functions that compose inside those handlers.

## Production checklist

- configure proxy buffering and idle timeouts for SSE;
- set cache headers for static assets;
- enforce auth/session/CSRF/request size policy in app middleware;
- instrument logs/traces/metrics with your platform tooling;
- run a deployment smoke test that exercises full-page responses, Datastar action patches, and any live streams.

See `performance-deployment.md` for details.
