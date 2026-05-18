import type * as HttpApp from "@effect/platform/HttpApp"
import * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Effect from "effect/Effect"
import type { Handler } from "./handler.js"

export const toPlatformApp = <E, R>(
  app: Handler<E, R>
): HttpApp.Default<E | HttpServerError.RequestError, R> =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const webRequest = yield* HttpServerRequest.toWeb(request)
    const webResponse = yield* app(webRequest)
    return HttpServerResponse.fromWeb(webResponse)
  })
