# Performance and deployment checklist

`ts-star` favors simple server-rendered HTML plus Datastar patches. That is usually fast enough, especially once repeated HTML is compressed, but production deployments need intentional proxy, caching, and streaming settings.

## Compression

- Enable gzip or Brotli for HTML, JavaScript, and non-streaming text responses.
- Repeated HTML fragments compress very well; do not prematurely replace clear server-rendered patches with a bespoke diff protocol.
- Be careful with compression middleware on SSE. Some middleware buffers chunks to improve compression ratio and can delay live updates.
- If a proxy compresses `text/event-stream`, verify that events flush promptly under load. If not, disable streaming compression and keep normal page/direct-response compression enabled.

## Reverse proxy and HTTP versions

SSE works over normal HTTP. Behind a proxy:

- keep upstream connections alive;
- disable response buffering for `text/event-stream`;
- set read/idle timeouts longer than the heartbeat interval;
- avoid request buffering for large uploads if the app streams request bodies;
- test reconnect behavior when the proxy restarts or closes idle sockets.

HTTP/2 can reduce connection pressure when browsers multiplex requests, but intermediaries still need correct streaming flush behavior. HTTP/3 is fine when the host/proxy supports SSE-like streaming reliably; do not require it for correctness.

## Common proxy settings

Nginx-style deployments usually need:

```nginx
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_buffering off;
proxy_read_timeout 1h;
```

CDN/proxy products have equivalent buffering and idle-timeout settings. Confirm them with a live-query smoke test before relying on realtime behavior.

## Datastar client asset

Use one of the `Client` helpers to make the asset policy explicit:

- development: `cache-control: no-cache` for quick iteration;
- production fingerprinted path: `public, max-age=31536000, immutable`;
- production stable `/datastar.js`: shorter max-age plus validation headers such as `etag`;
- CDN: use `datastarScript("https://...")` only with a pinned version you test.

The vendored `vendor/datastar.js` is the source of truth for examples. Do not silently float production pages to an untested Datastar runtime. Source maps are optional; if published, serve them with the same versioning policy as the script.

## Stream scalability

- Treat one live view as one SSE connection.
- Heartbeats keep proxies and browsers aware that the stream is alive; choose an interval shorter than proxy idle timeouts.
- Invalidation streams should use bounded buffers or coalescing for current-view UI updates.
- Core does not include a broker. Redis, NATS, Postgres notifications, or app-specific PubSub should adapt into Effect `Stream` invalidations.
- Set honest maximum-client expectations per deployment. SSE is efficient, but thousands of long-lived connections still require file descriptors, memory, and proxy capacity.

## Rendering cost

Fat morphs and current-view rendering keep the architecture understandable. Optimize later, only for measured hot paths:

- batch invalidations;
- share rendered snapshots for popular identical views;
- cache read models;
- patch smaller elements for hot regions;
- pre-render static fragments.

Do not promise LiveView-style structural diffing or websocket-scale sync semantics until the framework actually implements them.

## Deployment smoke test

Before shipping an app behind a proxy:

1. Load a normal page and confirm the pinned Datastar script cache headers.
2. Trigger a direct HTML patch action and confirm a `200` Datastar response applies.
3. Open a live query, wait longer than one heartbeat, and confirm the connection stays open.
4. Mutate backend state from another request and confirm connected browsers receive the current rendered view.
5. Restart/close a connection and confirm reconnect renders current state.
