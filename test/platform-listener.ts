import { NodeHttpServer } from "@effect/platform-node"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Scope from "effect/Scope"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type { RequestListener } from "node:http"

const activeScopes = new Set<Scope.Closeable>()

export const makePlatformListener = async (
  app: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    unknown,
    HttpServerRequest.HttpServerRequest | Scope.Scope
  >
): Promise<RequestListener> => {
  const scope = await Effect.runPromise(Scope.make())
  activeScopes.add(scope)
  return Effect.runPromise(NodeHttpServer.makeHandler(app, { scope }))
}

export const closePlatformListeners = async (): Promise<void> => {
  const scopes = [...activeScopes]
  activeScopes.clear()
  await Promise.all(scopes.map((scope) => Effect.runPromise(Scope.close(scope, Exit.void))))
}
