import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import * as Root from "../src/index.js"
import {
  Client,
  contract,
  ds,
  live,
  Platform,
  read,
  reply,
  Sse,
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
    expect("Model" in Root).toBe(false)
    expect("Realtime" in Root).toBe(false)
    expect("liveQuery" in Root).toBe(false)
    expect("liveQueryResponse" in Root).toBe(false)
    expect("commandDone" in Root).toBe(false)
    expect("makeRealtimePubSub" in Root).toBe(false)
    expect(live.query).toBeDefined()
    expect("Security" in Root).toBe(false)
    expect("Validation" in Root).toBe(false)
    expect("Observability" in Root).toBe(false)
    expect("requireCsrfToken" in Root).toBe(false)
    expect("FormValidationError" in Root).toBe(false)
    expect("Telemetry" in Root).toBe(false)
    expect(read.signals).toBeDefined()
    expect(reply.patch).toBeDefined()
    expect(reply.navigate).toBeDefined()
    expect(Sse.patchSignals).toBeDefined()

    await expect(Effect.runPromise(Effect.succeed("ok"))).resolves.toBe("ok")
  })
})
