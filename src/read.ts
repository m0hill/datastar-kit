import * as Schema from "effect/Schema"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import {
  platformReadQuery,
  platformReadQueryFromRequest,
  platformReadSignals,
  platformReadSignalsFromRequest
} from "./platform.js"

export const signals = <A, R>(schema: Schema.Decoder<A, R>) => platformReadSignals(schema)

export const signalsFrom = <A, R>(
  request: HttpServerRequest.HttpServerRequest,
  schema: Schema.Decoder<A, R>
) => platformReadSignalsFromRequest(request, schema)

export const query = <A, R>(schema: Schema.Decoder<A, R>) => platformReadQuery(schema)

export const queryFrom = <A, R>(
  request: HttpServerRequest.HttpServerRequest,
  schema: Schema.Decoder<A, R>
) => platformReadQueryFromRequest(request, schema)
