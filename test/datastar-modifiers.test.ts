import { describe, expect, it } from "vitest"
import { on, onIntersect, onInterval, onSignalPatch, post, raw, signal } from "../src/datastar.js"

describe("Datastar modifier helpers", () => {
  it("builds data-on event modifiers in Datastar syntax", () => {
    expect(on("input", post("/search"), { debounce: 200 })).toEqual({
      "data-on:input__debounce.200ms": '@post("/search")'
    })
  })

  it("builds tagged debounce and listener target modifiers", () => {
    const count = signal<number, "count">("count")

    expect(on("click", count.add(1), { window: true, debounce: { duration: "500ms", leading: true } })).toEqual({
      "data-on:click__window__debounce.500ms.leading": "$count++"
    })
  })

  it("builds prevent/stop and throttle modifiers", () => {
    expect(on("submit", post("/save"), { prevent: true, stop: true, throttle: { duration: "1s", trailing: true } })).toEqual({
      "data-on:submit__prevent__stop__throttle.1s.trailing": '@post("/save")'
    })
  })

  it("builds intersection modifiers", () => {
    expect(onIntersect(raw("$visible = true"), { once: true, full: true, delay: 100 })).toEqual({
      "data-on-intersect__once__full__delay.100ms": "$visible = true"
    })
  })

  it("builds interval duration modifiers", () => {
    const count = signal<number, "count">("count")

    expect(onInterval(count.add(1), { duration: "500ms", leading: true })).toEqual({
      "data-on-interval__duration.500ms.leading": "$count++"
    })
  })

  it("builds signal patch timing modifiers", () => {
    expect(onSignalPatch(raw("console.log(patch)"), { debounce: { duration: "250ms", noTrailing: true } })).toEqual({
      "data-on-signal-patch__debounce.250ms.notrailing": "console.log(patch)"
    })
  })
})
