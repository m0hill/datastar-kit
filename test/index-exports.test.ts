import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import { Client, Datastar, Html, Jsx, Platform, Realtime, Sse, platformRouter } from "../src/index.js"

describe("package root exports", () => {
  it("exports native Effect Platform helpers and namespaces", async () => {
    const app = platformRouter(HttpRouter.route("GET", "/", HttpServerResponse.text("ok")))

    expect(app).toBeDefined()
    expect(Platform.platformRouter).toBe(platformRouter)
    expect(Client.datastarDocument).toBeDefined()
    expect(Datastar.signal).toBeDefined()
    expect(Html.h).toBeDefined()
    expect(Jsx.jsx).toBeDefined()
    expect(Realtime.makeRealtimePubSub).toBeDefined()
    expect(Realtime.makeRealtimePubSubScoped).toBeDefined()
    expect(Realtime.makeBroadcaster).toBeDefined()
    expect(Sse.patchSignals).toBeDefined()

    await expect(Effect.runPromise(Effect.succeed("ok"))).resolves.toBe("ok")
  })
})
