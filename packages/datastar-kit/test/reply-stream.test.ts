import { afterEach, describe, expect, it, vi } from "vitest"
import { h } from "../src/html.js"
import * as reply from "../src/reply.js"

describe("reply SSE responses", () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it("serves Datastar signal patch responses", async () => {
    const response = reply.signals({ count: 1 }, {}, { headers: { "x-signals": "yes" } })

    expect(response.headers.get("x-signals")).toBe("yes")
    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"count":1}\n\n'
    )
  })

  it("renders HTML nodes in element patches", async () => {
    const response = reply.patch(
      h("span", {}, "Ada & Grace"),
      { selector: "#name" },
      { headers: { "x-patch": "yes" } }
    )

    expect(response.headers.get("x-patch")).toBe("yes")
    expect(await response.text()).toBe(
      "event: datastar-patch-elements\ndata: selector #name\ndata: elements <span>Ada &amp; Grace</span>\n\n"
    )
  })

  it("streams string and byte chunks", async () => {
    const response = reply.stream([
      "event: first\n\n",
      new TextEncoder().encode("event: second\n\n")
    ])

    expect(await response.text()).toBe("event: first\n\nevent: second\n\n")
  })

  it("streams Web Stream responses with headers", async () => {
    const source = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("event: meta\n\n")
        controller.close()
      }
    })
    const response = reply.stream(source, {}, { headers: { "x-stream": "web" } })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(response.headers.get("cache-control")).toBe("no-cache")
    expect(response.headers.get("x-stream")).toBe("web")
    expect(await response.text()).toBe("event: meta\n\n")
  })

  it("runs the event source cleanup when the client cancels", async () => {
    let cleanedUp: () => void = () => undefined
    const cleanup = new Promise<void>((resolve) => {
      cleanedUp = resolve
    })
    async function* events() {
      try {
        yield "event: first\n\n"
        yield "event: second\n\n"
      } finally {
        cleanedUp()
      }
    }

    const reader = reply.stream(events()).body!.getReader()
    await reader.read()
    await reader.cancel()

    await expect(cleanup).resolves.toBeUndefined()
  })

  it("starts heartbeat timers on first pull and clears them on cancel", async () => {
    vi.useFakeTimers()
    async function* events() {
      yield "event: ready\n\n"
      await new Promise<never>(() => {})
    }

    const reader = reply
      .stream(events(), {
        heartbeat: { initialDelayMs: 10, intervalMs: 20, comment: "tick" }
      })
      .body!.getReader()

    expect(vi.getTimerCount()).toBe(0)
    const first = await reader.read()
    expect(new TextDecoder().decode(first.value)).toBe("event: ready\n\n")
    expect(vi.getTimerCount()).toBe(1)

    const next = reader.read()
    await vi.advanceTimersByTimeAsync(10)
    const heartbeat = await next
    expect(new TextDecoder().decode(heartbeat.value)).toBe(": tick\n\n")
    expect(vi.getTimerCount()).toBe(1)

    await reader.cancel()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("clears heartbeat timers when the event source closes", async () => {
    vi.useFakeTimers()
    const reader = reply
      .stream(["event: ready\n\n"], {
        heartbeat: { intervalMs: 100 }
      })
      .body!.getReader()

    expect(await reader.read()).toMatchObject({ done: false })
    expect(vi.getTimerCount()).toBe(1)
    await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
    expect(vi.getTimerCount()).toBe(0)
  })

  it("repeats heartbeats on the interval after the initial delay", async () => {
    vi.useFakeTimers()
    async function* events() {
      yield "event: ready\n\n"
      await new Promise<never>(() => {})
    }
    const reader = reply
      .stream(events(), { heartbeat: { initialDelayMs: 5, intervalMs: 50 } })
      .body!.getReader()
    const decode = async () => new TextDecoder().decode((await reader.read()).value)

    await decode()
    const first = decode()
    await vi.advanceTimersByTimeAsync(5)
    expect(await first).toBe(": heartbeat\n\n")

    const second = decode()
    await vi.advanceTimersByTimeAsync(49)
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(await second).toBe(": heartbeat\n\n")

    await reader.cancel()
  })

  it("errors the response stream and stops heartbeats when the event source throws", async () => {
    vi.useFakeTimers()
    const failure = new Error("database went away")
    async function* events() {
      yield "event: ready\n\n"
      throw failure
    }
    const reader = reply.stream(events(), { heartbeat: { intervalMs: 100 } }).body!.getReader()

    await reader.read()
    await expect(reader.read()).rejects.toBe(failure)
    expect(vi.getTimerCount()).toBe(0)
  })
})
