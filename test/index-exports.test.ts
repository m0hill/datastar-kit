import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import {
  Client,
  Contracts,
  Datastar,
  Html,
  Jsx,
  Model,
  Observability,
  Platform,
  Realtime,
  Runtime,
  Security,
  Sse,
  Validation,
  platformRouter
} from "../src/index.js"

describe("package root exports", () => {
  it("exports native Effect Platform helpers and namespaces", async () => {
    const app = platformRouter(HttpRouter.route("GET", "/", HttpServerResponse.text("ok")))

    expect(app).toBeDefined()
    expect(Platform.platformRouter).toBe(platformRouter)
    expect(Client.datastarDocument).toBeDefined()
    expect(Contracts.defineSignals).toBeDefined()
    expect(Datastar.signal).toBeDefined()
    expect(Html.h).toBeDefined()
    expect(Jsx.jsx).toBeDefined()
    expect(Model.LiveQuery.make).toBeDefined()
    expect(Observability.Telemetry).toBeDefined()
    expect(Runtime.requestRuntimeLayer).toBeDefined()
    expect(Security.requireCsrfToken).toBeDefined()
    expect(Validation.FormValidationError).toBeDefined()
    expect(Realtime.makeRealtimePubSub).toBeDefined()
    expect(Realtime.makeRealtimePubSubScoped).toBeDefined()
    expect(Realtime.heartbeatStream).toBeDefined()
    expect(Realtime.makeBroadcaster).toBeDefined()
    expect(Sse.patchSignals).toBeDefined()

    await expect(Effect.runPromise(Effect.succeed("ok"))).resolves.toBe("ok")
  })
})
