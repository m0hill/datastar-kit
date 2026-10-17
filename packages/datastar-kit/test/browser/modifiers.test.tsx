import { afterEach, describe, expect, it, vi } from "vitest"
import { js, mod, signal } from "../../src/ds/index.js"
import { mount, query, signalValue } from "./datastar.js"

const count = signal<number, "count">("count")
const increment = js<void>`${count}++`
const log = signal<string, "log">("log")
const append = (entry: string) => js<void>`${log} += ${entry}`

const click = (selector: string, times = 1): void => {
  for (let index = 0; index < times; index += 1) query(selector).click()
}

// Real Datastar applying modifier suffixes rendered from `mod(...)`. Timing modifiers use fake
// timers; Datastar reads the global timer functions when it schedules, so the fakes apply.
describe("Datastar modifiers rendered by mod()", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("applies event listener modifiers", async () => {
    await mount(
      <main data-signals={{ count: 0, log: "" }}>
        <button
          id="once"
          type="button"
          data-on:click={mod(increment, { once: true })}
        />
        <a
          id="prevent"
          href="#navigated"
          data-on:click={mod(append("prevent;"), { prevent: true })}
        />
        <div
          id="parent"
          data-on:click={append("parent;")}
        >
          <button
            id="stop"
            type="button"
            data-on:click={mod(append("stop;"), { stop: true })}
          />
        </div>
        <div
          id="capturing"
          data-on:click={mod(append("capture;"), { capture: true })}
        >
          <button
            id="target"
            type="button"
            data-on:click={append("target;")}
          />
        </div>
      </main>
    )

    click("#once", 3)
    expect(signalValue("count")).toBe(1)

    click("#prevent")
    expect(location.hash).toBe("")

    click("#stop")
    click("#target")
    expect(signalValue("log")).toBe("prevent;stop;capture;target;")
  })

  it("listens on window, document, outside the element, and cased event names", async () => {
    await mount(
      <main data-signals={{ log: "" }}>
        <div data-on:resize={mod(append("window;"), { window: true })} />
        <div data-on:visibilitychange={mod(append("document;"), { document: true })} />
        <div
          id="menu"
          data-on:click={mod(append("outside;"), { outside: true })}
        >
          <button
            id="inside"
            type="button"
          />
        </div>
        <button
          id="elsewhere"
          type="button"
        />
        <div
          id="widget"
          data-on:widget-loaded={mod(append("camel;"), { case: "camel" })}
        />
      </main>
    )

    window.dispatchEvent(new Event("resize"))
    document.dispatchEvent(new Event("visibilitychange"))
    click("#inside")
    click("#elsewhere")
    query("#widget").dispatchEvent(new Event("widget-loaded"))
    query("#widget").dispatchEvent(new Event("widgetLoaded"))

    expect(signalValue("log")).toBe("window;document;outside;camel;")
  })

  it("delays event handlers", async () => {
    vi.useFakeTimers()
    await mount(
      <main data-signals={{ count: 0 }}>
        <button
          id="delayed"
          type="button"
          data-on:click={mod(increment, { delay: 500 })}
        />
      </main>
    )

    click("#delayed")
    vi.advanceTimersByTime(499)
    expect(signalValue("count")).toBe(0)
    vi.advanceTimersByTime(1)
    expect(signalValue("count")).toBe(1)
  })

  it("debounces with trailing calls by default and leading-only calls on request", async () => {
    vi.useFakeTimers()
    await mount(
      <main data-signals={{ count: 0, log: "" }}>
        <button
          id="trailing"
          type="button"
          data-on:click={mod(increment, { debounce: "200ms" })}
        />
        <button
          id="leading"
          type="button"
          data-on:click={mod(append("leading;"), {
            debounce: { duration: 200, leading: true, noTrailing: true }
          })}
        />
      </main>
    )

    click("#trailing", 3)
    vi.advanceTimersByTime(150)
    click("#trailing")
    vi.advanceTimersByTime(199)
    expect(signalValue("count")).toBe(0)
    vi.advanceTimersByTime(1)
    expect(signalValue("count")).toBe(1)

    click("#leading", 3)
    expect(signalValue("log")).toBe("leading;")
    vi.advanceTimersByTime(200)
    expect(signalValue("log")).toBe("leading;")
  })

  it("throttles with leading calls by default and trailing-only calls on request", async () => {
    vi.useFakeTimers()
    await mount(
      <main data-signals={{ count: 0, log: "" }}>
        <button
          id="leading"
          type="button"
          data-on:click={mod(increment, { throttle: 100 })}
        />
        <button
          id="trailing"
          type="button"
          data-on:click={mod(append("trailing;"), {
            throttle: { duration: "100ms", noLeading: true, trailing: true }
          })}
        />
      </main>
    )

    click("#leading", 3)
    expect(signalValue("count")).toBe(1)
    vi.advanceTimersByTime(100)
    expect(signalValue("count")).toBe(1)

    click("#trailing", 3)
    expect(signalValue("log")).toBe("")
    vi.advanceTimersByTime(100)
    expect(signalValue("log")).toBe("trailing;")
  })

  it("runs intervals at the rendered duration, optionally on the leading edge", async () => {
    vi.useFakeTimers()
    await mount(
      <main data-signals={{ count: 0 }}>
        <div data-on-interval={mod(increment, { duration: 500, leading: true })} />
      </main>
    )

    expect(signalValue("count")).toBe(1)
    vi.advanceTimersByTime(499)
    expect(signalValue("count")).toBe(1)
    vi.advanceTimersByTime(1)
    expect(signalValue("count")).toBe(2)
  })

  // A regression here schedules a 0ms interval, which spins a fake clock forever, so these check the
  // period Datastar passes to the real setInterval instead of advancing time.
  it.each([
    ["only the leading tag is set", { leading: true }, 1],
    ["the duration flag has no value", { duration: true }, 0]
  ] as const)(
    "keeps Datastar's 1s default interval when %s",
    async (_label, modifiers, leadingRuns) => {
      const setInterval = vi.spyOn(window, "setInterval")
      await mount(
        <main data-signals={{ count: 0 }}>
          <div data-on-interval={mod(increment, modifiers)} />
        </main>
      )
      document.body.replaceChildren()

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000)
      expect(signalValue("count")).toBe(leadingRuns)
    }
  )

  it("delays init expressions", async () => {
    vi.useFakeTimers()
    await mount(
      <main
        data-signals={{ count: 0 }}
        data-init={mod(increment, { delay: "1s" })}
      />
    )

    vi.advanceTimersByTime(999)
    expect(signalValue("count")).toBe(0)
    vi.advanceTimersByTime(1)
    expect(signalValue("count")).toBe(1)
  })

  it("fires intersection handlers once", async () => {
    await mount(
      <main data-signals={{ count: 0 }}>
        <div
          id="visible"
          style="height: 10px"
          data-on-intersect={mod(increment, { once: true, half: true })}
        />
      </main>
    )

    await expect.poll(() => signalValue("count")).toBe(1)
    query("#visible").style.display = "none"
    query("#visible").style.display = "block"
    await expect.poll(() => signalValue("count")).toBe(1)
  })
})
