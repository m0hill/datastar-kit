# Changelog

## Unreleased

### Added

- First release. `read.signals` reads the current request's Datastar signals through Effect's cached body, and `read.decode(schema)` decodes them with an Effect schema, failing with `SignalReadError` or `SchemaError`. `read.flattenError` groups a `SchemaError`'s messages into `{ form, fields }`. `reply.page`, `patch`, `signals`, `remove`, and `done` return Effect `HttpServerResponse`s, `reply.navigate` returns an Effect that fails with `NavigationError` for an unsafe URL, and `reply.stream` turns an Effect `Stream` of events into an SSE response that stops when the client disconnects.
