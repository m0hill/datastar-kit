import { event, reply as core } from "datastar-kit"
import { Context, Deferred, Effect, Fiber, Layer, Stream } from "effect"
import { TestClock } from "effect/testing"
import { HttpRouter, HttpServerResponse } from "effect/http"
import { describe, expect, it } from "vitest"
import { reply } from "../src/index.js"

const serve = <R extends HttpRouter.HttpRouter | HttpRouter.Request<"Error", unknown>>(
  route: Layer.Layer<never, never, R>
) => HttpRouter.toWebHandler(route, { disableLogger: true }).handler

const get = (handler: ReturnType<typeof serve>) => handler(new Request("http://localhost/"))

const summary = async (response: Response) => ({
  status: response.status,
  contentType: response.headers.get("content-type"),
  cacheControl: response.headers.get("cache-control"),
  body: await response.text()
})

describe("reply", () => {
  it("matches datastar-kit's responses for every fixed reply, on every request", async () => {
    const cases = [
      [reply.patch(<p id="msg">Saved</p>), core.patch(<p id="msg">Saved</p>)],
      [reply.signals({ count: 1 }), core.signals({ count: 1 })],
      [reply.remove("#toast"), core.remove("#toast")],
      [reply.navigate("/done"), core.navigate("/done")],
      [reply.done(), core.done()],
      [reply.page(<h1>Hi</h1>, { title: "Home" }), core.page(<h1>Hi</h1>, { title: "Home" })]
    ] as const

    for (const [response, expected] of cases) {
      const handler = serve(HttpRouter.add("GET", "/", response))
      const first = await summary(await get(handler))
      expect(first).toEqual(await summary(expected))
      // A route can hold one response value, so its body must survive being sent twice.
      expect(await summary(await get(handler))).toEqual(first)
    }
  })

  it("fails navigate with a catchable NavigationError for an unsafe URL", async () => {
    const handler = serve(
      HttpRouter.add(
        "GET",
        "/",
        reply
          .navigate("https://evil.example/")
          .pipe(
            Effect.catchTag("NavigationError", (error) =>
              Effect.succeed(HttpServerResponse.text(error.cause.url, { status: 400 }))
            )
          )
      )
    )

    const response = await get(handler)

    expect(response.status).toBe(400)
    expect(await response.text()).toBe("https://evil.example/")
  })
})

const pause = (ms: number) => Stream.fromEffect(Effect.sleep(ms)).pipe(Stream.drain)

class Greeting extends Context.Service<Greeting, string>()("test/Greeting") {}

describe("reply.stream", () => {
  it("streams event chunks with the services of the effect that built the response", async () => {
    const route = HttpRouter.add(
      "GET",
      "/",
      Effect.gen(function* () {
        const events = Stream.fromEffect(Effect.service(Greeting)).pipe(
          Stream.map((greeting) => event.patch(<p id="greeting">{greeting}</p>))
        )
        return yield* reply.stream(events)
      }).pipe(Effect.provideService(Greeting, "Hello"))
    )

    const response = await get(serve(route))

    const { body, ...headers } = await summary(response)
    const { body: _, ...expectedHeaders } = await summary(core.stream([]))
    expect(headers).toEqual(expectedHeaders)
    expect(body).toBe(event.patch(<p id="greeting">Hello</p>))
  })

  it("sends heartbeats after the initial delay and then on each interval, ending with the events", () =>
    Effect.gen(function* () {
      const response = yield* reply.stream(
        pause(5).pipe(Stream.concat(Stream.make("event: first\n\n")), Stream.concat(pause(55))),
        { heartbeat: { initialDelayMs: 10, intervalMs: 40, comment: "tick" } }
      )
      if (response.body._tag !== "Stream") throw new Error("expected a streamed body")
      const body = yield* Effect.forkChild(Stream.mkString(Stream.decodeText(response.body.stream)))

      yield* Effect.yieldNow
      yield* TestClock.adjust(60)

      // The event comes at 5, beats at 10 and 50, and the events end at 60, before the beat due at 90.
      expect(yield* Fiber.join(body)).toBe("event: first\n\n: tick\n\n: tick\n\n")
    }).pipe(Effect.provide(TestClock.layer()), Effect.runPromise))

  it("interrupts an idle stream when the client disconnects, so its finalizers run", async () => {
    const finalized = Effect.runSync(Deferred.make<void>())
    const route = HttpRouter.add(
      "GET",
      "/",
      reply.stream(
        Stream.make("event: first\n\n").pipe(
          Stream.concat(Stream.never),
          Stream.ensuring(Deferred.succeed(finalized, undefined))
        )
      )
    )

    const reader = (await get(serve(route))).body!.getReader()
    await reader.read()
    await reader.cancel()

    await expect(Effect.runPromise(Deferred.await(finalized))).resolves.toBeUndefined()
  })
})
