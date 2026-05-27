# Deployment

Datastar Kit targets fetch-compatible JavaScript runtimes. It does not ship a server adapter, process manager, asset pipeline, session store, database adapter, or live broker.

Use the deployment tools that fit your app. The SDK remains a set of functions inside your handlers.

## Runtime integration

Hono, Elysia, Bun, Deno, Cloudflare Workers, Node fetch adapters, and custom routers can call Datastar Kit helpers directly:

```ts
export default {
  fetch(request: Request) {
    return app.fetch(request)
  }
}
```

Core helpers use Web Standard primitives such as `Request`, `Response`, `Headers`, `URL`, and `ReadableStream`.

## Datastar runtime asset

Datastar Kit does not bundle, install, or serve the Datastar browser runtime. This release is written and tested against Datastar `v1.0.1`; include a pinned CDN URL or serve a compatible self-hosted copy.

```tsx
const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

return reply.page(appShell, {
  head: <script type="module" src={DATASTAR_RUNTIME} />
})
```

For self-hosted assets, prefer immutable caching on versioned filenames:

```http
cache-control: public, max-age=31536000, immutable
```

## SSE and proxies

Datastar patches and streams use `text/event-stream`. In production:

- disable proxy buffering for SSE routes;
- keep idle/read timeouts longer than your heartbeat interval;
- avoid compression settings that buffer streaming chunks;
- smoke test through the same proxy path used in production.

For Nginx-style deployments:

```nginx
proxy_buffering off;
```

## Realtime resources

Datastar Kit does not include a live broker. Redis, NATS, Postgres notifications, in-memory subscribers, Durable Objects, queues, or app-specific channels should remain app-owned and adapt into `reply.stream(...)` event sources.

## Production checklist

- Serve the Datastar browser runtime with a pinned version.
- Configure static asset caching.
- Configure SSE buffering and timeout behavior.
- Enforce auth, CSRF, ownership, request size, and rate-limit policy in app code.
- Instrument logs, traces, and metrics through your platform tooling.
- Test full-page responses, action patches, `204` command completion, signal patches, and any live streams.

Next: [Testing](testing.md).
