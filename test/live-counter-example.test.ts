import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { countFragment, createLiveCounter, pageView } from "../examples/live-counter.js"
import { render } from "../src/html.js"
import { closeServer, serve, serverOrigin } from "../src/node.js"

describe("live counter example", () => {
  it("renders a page that opens a Datastar SSE stream", () => {
    expect(pageView()).toContain('data-init="@get(&quot;/live&quot;)"')
  })

  it("keeps count fragments as composable HTML nodes", () => {
    const fragment = countFragment(3)

    expect(fragment.tag).toBe("output")
    expect(fragment.attrs).toEqual({ id: "count" })
  })

  it("renders count fragments for fat morph patches", () => {
    expect(render(countFragment(3))).toBe('<output id="count">3</output>')
  })

  it("publishes increments to live SSE subscribers", async () => {
    const liveCounter = createLiveCounter()
    const liveResponse = await Effect.runPromise(liveCounter.live(new Request("http://localhost/live")))
    const body = liveResponse.text()

    await Effect.runPromise(liveCounter.increment(new Request("http://localhost/increment", { method: "POST" })))
    await Effect.runPromise(liveCounter.broadcaster.closeAll())

    expect(await body).toBe('event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n')
    expect(liveCounter.currentCount()).toBe(1)
  })

  it("dispatches page and increment routes", async () => {
    const liveCounter = createLiveCounter()
    const page = await Effect.runPromise(liveCounter.app(new Request("http://localhost/")))
    const increment = await Effect.runPromise(liveCounter.app(new Request("http://localhost/increment", { method: "POST" })))
    const html = await page.text()

    expect(page.status).toBe(200)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("live-counter")
    expect(html).toContain('<script type="module" src="/datastar.js"></script>')
    expect(increment.status).toBe(204)
    expect(liveCounter.currentCount()).toBe(1)
  })

  it("streams live counter updates through node:http", async () => {
    const liveCounter = createLiveCounter()
    const server = await Effect.runPromise(serve(liveCounter.app))

    try {
      const origin = serverOrigin(server)
      const liveResponse = await fetch(`${origin}/live`)
      const reader = liveResponse.body?.getReader()

      expect(liveResponse.headers.get("content-type")).toBe("text/event-stream")
      expect(reader).toBeDefined()

      const increment = await fetch(`${origin}/increment`, { method: "POST" })
      expect(increment.status).toBe(204)

      const first = await reader!.read()
      expect(first.done).toBe(false)
      expect(new TextDecoder().decode(first.value)).toBe(
        'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
      )

      await Effect.runPromise(liveCounter.broadcaster.closeAll())
      await expect(reader!.read()).resolves.toEqual({ done: true, value: undefined })
    } finally {
      await Effect.runPromise(liveCounter.broadcaster.closeAll())
      await Effect.runPromise(closeServer(server))
    }
  })
})
