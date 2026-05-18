import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpServerError from "effect/unstable/http/HttpServerError"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { datastarDocument, type DatastarDocumentOptions } from "./client.js"
import { render, type Child } from "./html.js"
import { NoopTelemetryLive, type Telemetry } from "./observability.js"
import {
  isDatastarRequest,
  parseSignalsJson,
  platformRawSignalsFromRequest,
  type PlatformResponseOptions,
  type SignalJsonError
} from "./platform.js"
import * as reply from "./reply.js"
import type { JsonObject, PatchElementsOptions, PatchSignalsOptions } from "./sse.js"

export interface TsStarConfigValue {
  readonly datastarScriptSrc: string
  readonly mode: "development" | "production"
}

export class TsStarConfig extends Context.Service<TsStarConfig, TsStarConfigValue>()("ts-star/TsStarConfig") {}

export const defaultTsStarConfig: TsStarConfigValue = {
  datastarScriptSrc: "/datastar.js",
  mode: "development"
}

export const TsStarConfigLive = (config: Partial<TsStarConfigValue> = {}): Layer.Layer<TsStarConfig> =>
  Layer.succeed(TsStarConfig)({ ...defaultTsStarConfig, ...config })

export interface HtmlRendererValue {
  readonly render: (content: string | Exclude<Child, string>) => Effect.Effect<string>
}

export class HtmlRenderer extends Context.Service<HtmlRenderer, HtmlRendererValue>()("ts-star/HtmlRenderer") {}

export const HtmlRendererLive: Layer.Layer<HtmlRenderer> = Layer.succeed(HtmlRenderer)({
  render: (content) => Effect.succeed(typeof content === "string" ? content : render(content))
})

export interface DatastarProtocolValue {
  readonly page: (
    body: Child,
    options?: DatastarDocumentOptions,
    responseOptions?: PlatformResponseOptions
  ) => Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly patchElements: (
    elements: string | Exclude<Child, string>,
    options?: PatchElementsOptions,
    responseOptions?: reply.BodyOptions
  ) => Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly patchSignals: (
    signals: JsonObject | string,
    options?: PatchSignalsOptions,
    responseOptions?: reply.BodyOptions
  ) => Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly noContent: (options?: reply.DoneOptions) => Effect.Effect<HttpServerResponse.HttpServerResponse>
}

export class DatastarProtocol extends Context.Service<DatastarProtocol, DatastarProtocolValue>()("ts-star/DatastarProtocol") {}

export const DatastarProtocolLive: Layer.Layer<DatastarProtocol, never, HtmlRenderer | TsStarConfig> = Layer.effect(
  DatastarProtocol
)(
  Effect.gen(function*() {
    const renderer = yield* HtmlRenderer
    const config = yield* TsStarConfig

    return {
      page: (body, options = {}, responseOptions) =>
        Effect.succeed(
          HttpServerResponse.text(
            datastarDocument(body, { scriptSrc: config.datastarScriptSrc, ...options }),
            { ...responseOptions, contentType: responseOptions?.contentType ?? "text/html; charset=utf-8" }
          )
        ),
      patchElements: (elements, options, responseOptions) =>
        renderer.render(elements).pipe(
          Effect.map((html) => reply.patch(html, options, responseOptions))
        ),
      patchSignals: (signals, options, responseOptions) => Effect.succeed(reply.signals(signals, options, responseOptions)),
      noContent: (options) => Effect.succeed(reply.done(options))
    } satisfies DatastarProtocolValue
  })
)

export interface RequestContextValue {
  readonly request: HttpServerRequest.HttpServerRequest
  readonly method: HttpServerRequest.HttpServerRequest["method"]
  readonly url: URL
  readonly isDatastar: boolean
  readonly rawSignals: Effect.Effect<string, HttpServerError.HttpServerError>
}

export class RequestContext extends Context.Service<RequestContext, RequestContextValue>()("ts-star/RequestContext") {}

export const RequestContextLive: Layer.Layer<RequestContext, never, HttpServerRequest.HttpServerRequest> = Layer.effect(
  RequestContext
)(
  HttpServerRequest.HttpServerRequest.pipe(
    Effect.map((request) => ({
      request,
      method: request.method,
      url: new URL(request.url, "http://localhost"),
      isDatastar: isDatastarRequest(request),
      rawSignals: platformRawSignalsFromRequest(request)
    }))
  )
)

export interface SignalDecoderValue {
  readonly raw: Effect.Effect<string, HttpServerError.HttpServerError>
  readonly decode: <A, R>(
    schema: Schema.Decoder<A, R>
  ) => Effect.Effect<A, HttpServerError.HttpServerError | SignalJsonError | Schema.SchemaError, R>
}

export class SignalDecoder extends Context.Service<SignalDecoder, SignalDecoderValue>()("ts-star/SignalDecoder") {}

export const SignalDecoderLive: Layer.Layer<SignalDecoder, never, RequestContext> = Layer.effect(
  SignalDecoder
)(
  Effect.map(RequestContext, (context) => ({
    raw: context.rawSignals,
    decode: (schema) =>
      context.rawSignals.pipe(
        Effect.flatMap(parseSignalsJson),
        Effect.flatMap(Schema.decodeUnknownEffect(schema))
      )
  }))
)

export class ValidationError extends Error {
  readonly _tag = "ValidationError"

  constructor(
    message: string,
    readonly details?: unknown
  ) {
    super(message)
  }
}

export type FrameworkError = SignalJsonError | Schema.SchemaError | reply.ResponseStatusError | ValidationError

export interface ErrorMapperValue {
  readonly toResponse: (error: unknown) => Effect.Effect<HttpServerResponse.HttpServerResponse>
}

export class ErrorMapper extends Context.Service<ErrorMapper, ErrorMapperValue>()("ts-star/ErrorMapper") {}

const hasTag = (error: unknown, tag: string): boolean =>
  typeof error === "object" && error !== null && "_tag" in error && error._tag === tag

export const defaultErrorResponse = (error: unknown): HttpServerResponse.HttpServerResponse => {
  if (hasTag(error, "SignalJsonError")) {
    return HttpServerResponse.text("Invalid Datastar signals", { status: 400 })
  }

  if (hasTag(error, "SchemaError")) {
    return HttpServerResponse.text("Invalid request input", { status: 400 })
  }

  if (hasTag(error, "ValidationError")) {
    const message = error instanceof Error ? error.message : "Validation failed"
    return HttpServerResponse.text(message, { status: 400 })
  }

  if (hasTag(error, "CsrfError")) {
    return HttpServerResponse.text("CSRF check failed", { status: 403 })
  }

  if (hasTag(error, "UnauthorizedError")) {
    return HttpServerResponse.text("Unauthorized", { status: 401 })
  }

  if (hasTag(error, "RequestSizeLimitError")) {
    return HttpServerResponse.text("Request body too large", { status: 413 })
  }

  if (hasTag(error, "UnsafeRedirectUrlError")) {
    return HttpServerResponse.text("Unsafe redirect URL", { status: 400 })
  }

  if (error instanceof reply.ResponseStatusError) {
    return HttpServerResponse.text("Invalid Datastar response status", { status: 500 })
  }

  return HttpServerResponse.text("Internal Server Error", { status: 500 })
}

export const ErrorMapperLive: Layer.Layer<ErrorMapper> = Layer.succeed(ErrorMapper)({
  toResponse: (error) => Effect.succeed(defaultErrorResponse(error))
})

export const catchMappedErrors = <E, R>(
  effect: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R | ErrorMapper> =>
  effect.pipe(
    Effect.matchEffect({
      onFailure: (error) =>
        ErrorMapper.pipe(
          Effect.flatMap((mapper) => mapper.toResponse(error))
        ),
      onSuccess: Effect.succeed
    })
  )

export const runtimeCoreLayer = (config?: Partial<TsStarConfigValue>): Layer.Layer<
  TsStarConfig | HtmlRenderer | DatastarProtocol | ErrorMapper | Telemetry
> =>
  Layer.mergeAll(DatastarProtocolLive, ErrorMapperLive, NoopTelemetryLive).pipe(
    Layer.provideMerge(Layer.mergeAll(TsStarConfigLive(config), HtmlRendererLive))
  )

export const requestRuntimeLayer = (config?: Partial<TsStarConfigValue>): Layer.Layer<
  TsStarConfig | HtmlRenderer | DatastarProtocol | ErrorMapper | Telemetry | RequestContext | SignalDecoder,
  never,
  HttpServerRequest.HttpServerRequest
> =>
  Layer.mergeAll(runtimeCoreLayer(config), SignalDecoderLive).pipe(
    Layer.provideMerge(RequestContextLive)
  )
