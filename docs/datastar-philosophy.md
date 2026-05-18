# Datastar philosophy in ts-star

`ts-star` does not hide Datastar. It uses Datastar as the browser runtime and patch protocol while keeping application state on the server.

## Keep the browser simple

Use Datastar signals for:

- form/input values;
- query/filter parameters;
- local UI flags such as loading indicators;
- validation feedback returned by the server.

Avoid storing durable application state only in browser signals. If reconnecting or refreshing would lose correctness, the state belongs on the backend.

## Prefer server-rendered patches

Actions usually return one of:

- `204 No Content` when the command completed and another stream/query will refresh the UI;
- a direct HTML patch for local updates;
- a direct JSON signal patch for validation/loading state;
- an SSE stream for live queries.

This keeps the UI model close to HTTP and HTML instead of recreating a frontend component lifecycle.

## Expose the protocol

Low-level helpers such as `Sse.patchElements`, `Datastar.on`, `Datastar.get`, and `Platform.datastarHtmlResponse` stay available. The framework layers add defaults and safety, but the underlying Datastar concepts should remain visible.

## Reconnect safety

Live queries render current backend state on connect and after invalidation. They do not rely on event deltas that only make sense if every browser connection saw every prior event.
