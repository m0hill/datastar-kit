# Performance and deployment notes

Datastar Kit is small enough that most production performance work belongs around your application runtime: HTTP serving, data access, static assets, compression, and reverse proxy behavior.

## Compression

Use gzip or Brotli for ordinary HTML, CSS, JavaScript, and JSON responses when your platform supports it. Be careful with `text/event-stream`: compression can add buffering unless the platform flushes streaming chunks correctly.

## Reverse proxies and SSE

For Nginx-style deployments, disable buffering for SSE locations:

```nginx
proxy_buffering off;
```

Keep proxy/read idle timeouts longer than your heartbeat interval. A live view usually means one SSE connection per browser tab or active view.

## Static asset caching

Serve pinned static assets with immutable caching when possible:

```http
cache-control: public, max-age=31536000, immutable
```

Datastar runtime inclusion is explicit; pin the CDN version or serve your own copy.

## Live stream scalability

Core does not include a broker. Redis, NATS, Postgres notifications, in-memory subscribers, or app-specific channels should adapt into `AsyncIterable`/`ReadableStream` event sources owned by the application.

## Deployment smoke test

A useful Deployment smoke test should verify:

1. full-page HTML responses include the Datastar script;
2. a Datastar action returns a `200` SSE patch and the browser applies it;
3. a `204` command completes without a body;
4. live streams flush an initial patch and heartbeat comment through the proxy.
