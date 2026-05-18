import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as Context from "effect/Context"
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"

export type SpanAttributeValue = string | number | boolean
export type SpanAttributes = Readonly<Record<string, SpanAttributeValue | undefined>>

export interface TelemetrySpan {
  readonly setAttribute: (key: string, value: SpanAttributeValue) => Effect.Effect<void>
  readonly addEvent: (name: string, attributes?: SpanAttributes) => Effect.Effect<void>
  readonly recordException: (error: unknown) => Effect.Effect<void>
  readonly end: (attributes?: SpanAttributes) => Effect.Effect<void>
}

export interface TelemetryValue {
  readonly startSpan: (name: string, attributes?: SpanAttributes) => Effect.Effect<TelemetrySpan>
}

export class Telemetry extends Context.Service<Telemetry, TelemetryValue>()("ts-star/Telemetry") {}

const noopSpan: TelemetrySpan = {
  setAttribute: () => Effect.void,
  addEvent: () => Effect.void,
  recordException: () => Effect.void,
  end: () => Effect.void
}

export const NoopTelemetryLive: Layer.Layer<Telemetry> = Layer.succeed(Telemetry)({
  startSpan: () => Effect.succeed(noopSpan)
})

export interface TelemetryEvent {
  readonly type: "start" | "attribute" | "event" | "exception" | "end"
  readonly spanId: number
  readonly name?: string
  readonly attributes?: SpanAttributes | undefined
  readonly error?: unknown
}

export const makeInMemoryTelemetry = (): { readonly layer: Layer.Layer<Telemetry>; readonly events: readonly TelemetryEvent[] } => {
  const events: Array<TelemetryEvent> = []
  let nextSpanId = 0

  const layer = Layer.succeed(Telemetry)({
    startSpan: (name, attributes) =>
      Effect.sync(() => {
        const spanId = ++nextSpanId
        events.push({ type: "start", spanId, name, attributes })
        return {
          setAttribute: (key, value) => Effect.sync(() => {
            events.push({ type: "attribute", spanId, name: key, attributes: { value } })
          }),
          addEvent: (eventName, eventAttributes) => Effect.sync(() => {
            events.push({ type: "event", spanId, name: eventName, attributes: eventAttributes })
          }),
          recordException: (error) => Effect.sync(() => {
            events.push({ type: "exception", spanId, error })
          }),
          end: (endAttributes) => Effect.sync(() => {
            events.push({ type: "end", spanId, attributes: endAttributes })
          })
        } satisfies TelemetrySpan
      })
  })

  return { layer, events }
}

export const withSpan = <A, E, R>(
  name: string,
  attributes: SpanAttributes,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | Telemetry> =>
  Effect.acquireUseRelease(
    Telemetry.pipe(Effect.flatMap((telemetry) => telemetry.startSpan(name, attributes))),
    (span) =>
      effect.pipe(
        Effect.matchEffect({
          onFailure: (error) => span.recordException(error).pipe(Effect.andThen(Effect.fail(error))),
          onSuccess: Effect.succeed
        })
      ),
    (span) => span.end()
  )

export const observeRequest = <E, R>(
  attributes: SpanAttributes,
  effect: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
): Effect.Effect<HttpServerResponse.HttpServerResponse, E, R | Telemetry> =>
  Effect.acquireUseRelease(
    Telemetry.pipe(Effect.flatMap((telemetry) => telemetry.startSpan("ts-star.request", attributes))),
    (span) =>
      effect.pipe(
        Effect.matchEffect({
          onFailure: (error) => span.recordException(error).pipe(Effect.andThen(Effect.fail(error))),
          onSuccess: (response) => span.setAttribute("http.response.status_code", response.status).pipe(Effect.as(response))
        })
      ),
    (span) => span.end()
  )

export const observeDecode = <A, E, R>(
  kind: "signals" | "query" | "form" | "body",
  schemaName: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | Telemetry> =>
  withSpan(`ts-star.decode.${kind}`, { "ts-star.schema": schemaName }, effect)

export const observeRender = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | Telemetry> =>
  withSpan("ts-star.render", { "ts-star.render.name": name }, effect)

export const observeStream = <A, E, R>(
  name: string,
  attributes: SpanAttributes,
  stream: Stream.Stream<A, E, R>
): Stream.Stream<A, E, R | Telemetry> =>
  Stream.unwrap(
    Telemetry.pipe(
      Effect.flatMap((telemetry) => telemetry.startSpan(name, attributes)),
      Effect.map((span) =>
        stream.pipe(
          Stream.tapError((error) => span.recordException(error)),
          Stream.ensuring(span.end())
        )
      )
    )
  )
