import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import * as Root from "../src/index.js"
import {
  Client,
  contract,
  ds,
  Model,
  Observability,
  Platform,
  read,
  Realtime,
  reply,
  Security,
  Sse,
  Validation,
  fragment,
  h,
  page,
  platformRouter,
  props,
  raw,
  render
} from "../src/index.js"

describe("package root exports", () => {
  it("exports the tiny HTML surface, native Effect Platform helpers, and namespaces", async () => {
    const app = platformRouter(HttpRouter.route("GET", "/", HttpServerResponse.text("ok")))

    expect(app).toBeDefined()
    expect(Platform.platformRouter).toBe(platformRouter)
    expect(Client.datastarDocument).toBeDefined()
    expect(contract.signals).toBeDefined()
    expect(ds.signal).toBeDefined()
    expect(ds.delete).toBeDefined()
    expect(h).toBeDefined()
    expect(render).toBeDefined()
    expect(fragment).toBeDefined()
    expect(raw).toBeDefined()
    expect(props).toBeDefined()
    expect(page).toBeDefined()
    expect("Html" in Root).toBe(false)
    expect("Jsx" in Root).toBe(false)
    expect("jsx" in Root).toBe(false)
    expect("Fragment" in Root).toBe(false)
    expect(Model.LiveQuery.make).toBeDefined()
    expect(Observability.Telemetry).toBeDefined()
    expect(read.signals).toBeDefined()
    expect(reply.patch).toBeDefined()
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
