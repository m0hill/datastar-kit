import { expect, it } from "vitest"
import { post, signal } from "../../src/ds/index.js"
import { h } from "../../src/html.js"
import { loadDatastar, mount, query, queryAs } from "./datastar.js"

const debuggerRoot = (): ShadowRoot => {
  const root = query("datastar-kit-debugger").shadowRoot
  if (root === null) throw new Error("Debugger has no shadow root")
  return root
}

const debuggerQuery = (selector: string): HTMLElement => query(selector, debuggerRoot())

const count = (): string | null => query("#count").textContent
const status = (): string | null => debuggerQuery(".dsk-debug-timeline-status").textContent

it("time travels through debugger timeline snapshots", async () => {
  const countSignal = signal<number, "count">("count")
  mount(
    h(
      "main",
      { id: "app", "data-signals__ifmissing": '{"count": 0}' },
      h("output", { id: "count", "data-text": countSignal.toDatastarExpression() }),
      h(
        "button",
        {
          id: "increment",
          type: "button",
          "data-on:click": post("/fixtures/time-travel/increment").toDatastarExpression()
        },
        "+"
      )
    )
  )
  await import("../../src/debugger/index.js")
  await loadDatastar()
  await expect.poll(count).toBe("0")

  await expect.poll(status).toContain("1 snapshot")

  const details = queryAs(HTMLDetailsElement, "details", debuggerRoot())
  expect(details.open).toBe(false)
  debuggerQuery("summary").click()

  const hiddenPanel = debuggerQuery('[data-panel="events"]')
  const hiddenControl = debuggerQuery('[data-action="clear-events"]')
  debuggerQuery('[data-tab="events"]').click()
  debuggerQuery('[data-action="clear-events"]').click()
  document.dispatchEvent(new CustomEvent("datastar-fetch", { detail: { type: "started" } }))
  const eventCount = debuggerQuery('[data-role="event-count"]').textContent
  const search = debuggerQuery('[data-role="search"]')
  const searchHeight = search.getBoundingClientRect().height
  debuggerQuery('[data-tab="timeline"]').click()
  const timelineRange = debuggerQuery('[data-role="timeline-range"]')
  const timelineButton = debuggerQuery('[data-action="pause"]')

  expect({
    bridge: document.querySelector("[data-datastar-kit-debugger-bridge]") !== null,
    signalCount: debuggerQuery('[data-role="signal-count"]').textContent,
    eventCount,
    hiddenPanelDisplay: getComputedStyle(hiddenPanel).display,
    hiddenControlDisplay: getComputedStyle(hiddenControl).display,
    timelineSearchDisplay: getComputedStyle(search).display,
    timelineRangeDisplay: getComputedStyle(timelineRange).display,
    timelineRangeInControls:
      timelineRange.parentElement?.classList.contains("dsk-debug-controls") ?? false,
    timelineButtonMatchesSearchHeight:
      timelineButton.getBoundingClientRect().height === searchHeight
  }).toEqual({
    bridge: true,
    signalCount: "1 signal",
    eventCount: "1 event",
    hiddenPanelDisplay: "none",
    hiddenControlDisplay: "none",
    timelineSearchDisplay: "none",
    timelineRangeDisplay: "block",
    timelineRangeInControls: true,
    timelineButtonMatchesSearchHeight: true
  })
  debuggerQuery("summary").click()

  query("#app").append(query("datastar-kit-debugger"))

  query("#increment").click()
  await expect.poll(() => [count(), status()?.includes("2 snapshots")]).toEqual(["1", true])
  expect(debuggerQuery('[data-role="signals"]').textContent).toContain('"count": 1')
  expect(debuggerQuery('[data-role="event-count"]').textContent).not.toBe("0 events")

  query("#increment").click()
  await expect.poll(() => [count(), status()?.includes("3 snapshots")]).toEqual(["2", true])

  const range = queryAs(HTMLInputElement, ".dsk-timeline-range", debuggerRoot())
  range.value = "0"
  range.dispatchEvent(new InputEvent("input", { bubbles: true }))
  await expect.poll(() => [count(), status()?.startsWith("1/3")]).toEqual(["0", true])

  debuggerQuery(".dsk-debug-live").click()
  await expect.poll(() => [count(), status()?.includes("live")]).toEqual(["2", true])

  query("#increment").click()
  await expect.poll(count).toBe("3")

  document.dispatchEvent(
    new CustomEvent("datastar-fetch", {
      detail: {
        type: "started",
        argsRaw: { value: '<img src=x onerror="window.__injected=true">' }
      }
    })
  )
  document.dispatchEvent(
    new CustomEvent("datastar-fetch", {
      detail: {
        type: "datastar-patch-elements",
        argsRaw: { elements: '<section id="result"><strong>Updated</strong></section>' }
      }
    })
  )
  const patchEvent = Array.from(debuggerRoot().querySelectorAll(".dsk-debug-event")).find(
    (element) =>
      element.querySelector("summary")?.textContent?.includes("datastar-patch-elements") ?? false
  )
  expect(patchEvent?.querySelector('pre[data-content="html"]')?.textContent).toBe(
    '<section id="result">\n  <strong>Updated</strong>\n</section>'
  )
  expect(debuggerRoot().querySelector(".dsk-debug-event img")).toBeNull()

  query("datastar-kit-debugger").remove()
  await Promise.resolve()
  expect({
    bridge: document.querySelector("[data-datastar-kit-debugger-bridge]") !== null,
    callback: (window as { __datastarKitDebugger?: unknown }).__datastarKitDebugger !== undefined
  }).toEqual({ bridge: false, callback: false })
})
