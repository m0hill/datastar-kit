import { describe, expect, it } from "vitest"
import * as ds from "../src/ds.js"

describe("Datastar modifier helpers", () => {
  it("builds data-on event modifiers in Datastar syntax", () => {
    expect(ds.on("input", ds.post("/search"), { debounce: 200 })).toEqual({
      "data-on:input__debounce.200ms": '@post("/search")'
    })
  })

  it("builds tagged debounce and listener target modifiers", () => {
    expect(ds.on("click", ds.expr("$count++"), { window: true, debounce: { duration: "500ms", leading: true } })).toEqual({
      "data-on:click__window__debounce.500ms.leading": "$count++"
    })
  })

  it("builds prevent/stop and throttle modifiers", () => {
    expect(ds.on("submit", ds.post("/save"), { prevent: true, stop: true, throttle: { duration: "1s", trailing: true } })).toEqual({
      "data-on:submit__prevent__stop__throttle.1s.trailing": '@post("/save")'
    })
  })

  it("builds intersection modifiers", () => {
    expect(ds.onIntersect(ds.expr("$visible = true"), { once: true, full: true, delay: 100 })).toEqual({
      "data-on-intersect__once__full__delay.100ms": "$visible = true"
    })
  })

  it("builds interval duration modifiers", () => {
    expect(ds.onInterval(ds.expr("$count++"), { duration: "500ms", leading: true })).toEqual({
      "data-on-interval__duration.500ms.leading": "$count++"
    })
  })

  it("builds signal patch timing modifiers", () => {
    expect(ds.onSignalPatch(ds.expr("console.log(patch)"), { debounce: { duration: "250ms", noTrailing: true } })).toEqual({
      "data-on-signal-patch__debounce.250ms.notrailing": "console.log(patch)"
    })
  })
})
