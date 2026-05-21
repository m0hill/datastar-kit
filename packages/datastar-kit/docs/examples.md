# Examples

Examples are standalone workspace packages under `examples/*`. Each example should be copyable, own its runtime dependencies, and explain the specific integration or recipe it demonstrates.

## Fetch counter

`examples/fetch-counter` is the minimal example. It exports a plain Fetch-style handler that accepts a native `Request` and returns a native `Response`, uses TSX views, keeps `count` as backend-owned state, and returns `reply.patch(...)` for the focused Datastar update.

The local Node `http` adapter in that example is only for development. The handler itself stays framework-free so the same shape can be mounted in other fetch-compatible runtimes.

Run it from the repository root with:

```sh
pnpm run dev:fetch-counter
```
