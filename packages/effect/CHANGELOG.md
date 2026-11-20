# Changelog

## Unreleased

### Added

- First release. `read.signals` reads the current request's Datastar signals through Effect's cached body, and `read.decode(schema)` decodes them with an Effect schema, failing with `SignalReadError` or `SchemaError`. `read.flattenError` groups a `SchemaError`'s messages into `{ form, fields }`. `reply.page`, `patch`, `signals`, `remove`, `navigate`, `done`, and `stream` return Effects of datastar-kit's responses as `HttpServerResponse`s; `navigate` fails with `NavigationError` for an unsafe URL, and `stream` turns an Effect `Stream` of events into an SSE response that stops when the client disconnects.
