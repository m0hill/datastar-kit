import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import { runtimeCoreLayer } from "../src/runtime.js"
import {
  makeInMemoryTelemetry,
  observeDecode,
  observeRender,
  observeRequest,
  observeStream,
  Telemetry,
  withSpan
} from "../src/observability.js"

describe("observability helpers", () => {
  it("records Effect spans around successful and failed effects", async () => {
    const telemetry = makeInMemoryTelemetry()

    await Effect.runPromise(
      withSpan("custom", { route: "/ok" }, Effect.succeed("ok")).pipe(Effect.provide(telemetry.layer))
    )
    await Effect.runPromise(
      Effect.result(withSpan("fail", {}, Effect.fail(new Error("boom"))).pipe(Effect.provide(telemetry.layer)))
    )

    expect(telemetry.events.map((event) => event.type)).toEqual(["start", "end", "start", "exception", "end"])
    expect(telemetry.events[0]).toMatchObject({ type: "start", name: "custom", attributes: { route: "/ok" } })
  })

  it("records request status and decode/render spans", async () => {
    const telemetry = makeInMemoryTelemetry()
    const response = await Effect.runPromise(
      observeRequest(
        { "http.route": "/submit", "http.request.method": "POST", "datastar.request": true },
        observeDecode("signals", "ContactForm", observeRender("contact-result", Effect.succeed(HttpServerResponse.text("ok"))))
      ).pipe(Effect.provide(telemetry.layer))
    )

    expect(response.status).toBe(200)
    expect(telemetry.events.filter((event) => event.type === "start").map((event) => event.name)).toEqual([
      "ts-star.request",
      "ts-star.decode.signals",
      "ts-star.render"
    ])
    expect(telemetry.events).toContainEqual(expect.objectContaining({
      type: "attribute",
      name: "http.response.status_code",
      attributes: { value: 200 }
    }))
  })

  it("records stream open, errors, and close", async () => {
    const telemetry = makeInMemoryTelemetry()

    await Effect.runPromise(
      Effect.result(
        observeStream("ts-star.sse", { "stream.kind": "live-query" }, Stream.make("one").pipe(Stream.concat(Stream.fail("boom"))))
          .pipe(Stream.runCollect)
      ).pipe(Effect.provide(telemetry.layer))
    )

    expect(telemetry.events.map((event) => event.type)).toEqual(["start", "exception", "end"])
    expect(telemetry.events[0]).toMatchObject({ name: "ts-star.sse", attributes: { "stream.kind": "live-query" } })
  })

  it("provides noop telemetry from the runtime core layer", async () => {
    await expect(
      Effect.runPromise(Telemetry.pipe(Effect.flatMap((telemetry) => telemetry.startSpan("noop"))).pipe(Effect.provide(runtimeCoreLayer())))
    ).resolves.toBeDefined()
  })
})
