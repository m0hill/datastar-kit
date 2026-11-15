# Changelog

## Unreleased

### Added

- First release. `read.decode(schema)` reads the current request's Datastar signals and decodes them with an Effect schema, failing with `SignalReadError` or `SchemaError`. `read.flattenError` groups a `SchemaError`'s messages into `{ form, fields }`. `reply.page`, `patch`, `signals`, `remove`, `navigate`, and `done` return Effect `HttpServerResponse`s, and `reply.stream` turns an Effect `Stream` of events into an SSE response that stops when the client disconnects.
