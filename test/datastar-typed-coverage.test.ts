import { describe, expect, it } from "vitest"
import {
  bind,
  bindValue,
  dataClass,
  dataComputed,
  dataComputeds,
  dataSignal,
  effect,
  fn,
  get,
  indicatorValue,
  init,
  peek,
  post,
  raw,
  refValue,
  regex,
  setAll,
  signal,
  toggleAll
} from "../src/datastar.js"

describe("Datastar typed helper coverage", () => {
  it("covers core attribute forms and modifiers that the OSS client supports", () => {
    expect(effect(raw("$foo = $bar"))).toEqual({
      "data-effect": "$foo = $bar"
    })

    expect(init(post("/load"), { delay: 500, viewTransition: true })).toEqual({
      "data-init__delay.500ms__viewtransition": '@post("/load")'
    })

    expect(bind("is-checked", { case: "camel", prop: "checked", events: ["input", "change"] })).toEqual({
      "data-bind:is-checked__case.camel__prop.checked__event.input.change": true
    })

    expect(bindValue("selected", { prop: "checked", events: "change" })).toEqual({
      "data-bind__prop.checked__event.change": "selected"
    })

    expect(refValue("panel")).toEqual({ "data-ref": "panel" })
    expect(indicatorValue("fetching")).toEqual({ "data-indicator": "fetching" })

    expect(dataClass("my-class", raw("$active"), { case: "camel" })).toEqual({
      "data-class:my-class__case.camel": "$active"
    })

    expect(dataSignal("count", 0, { ifMissing: true })).toEqual({
      "data-signals:count__ifmissing": "0"
    })

    expect(dataSignal("my-signal", 1, { case: "camel" })).toEqual({
      "data-signals:my-signal__case.camel": "1"
    })

    expect(dataComputed("full-name", raw("$first + ' ' + $last"), { case: "camel" })).toEqual({
      "data-computed:full-name__case.camel": "$first + ' ' + $last"
    })

    expect(dataComputeds({ fullName: fn(raw("$first + ' ' + $last")) })).toEqual({
      "data-computed": `{"fullName": () => $first + ' ' + $last}`
    })
  })

  it("covers core actions and fetch response overrides", () => {
    const bar = signal<string, "bar">("bar")

    expect(peek(fn(bar)).toDatastarExpression()).toBe("@peek(() => $bar)")
    expect(setAll(true, { include: regex("^foo$") }).toDatastarExpression()).toBe(
      '@setAll(true, {"include": /^foo$/})'
    )
    expect(toggleAll({ exclude: regex("_temp$") }).toDatastarExpression()).toBe(
      '@toggleAll({"exclude": /_temp$/})'
    )
    expect(
      get("/fragment", {
        selector: null,
        responseOverrides: {
          selector: "#slot",
          mode: "append",
          namespace: "svg",
          useViewTransition: true
        }
      }).toDatastarExpression()
    ).toBe(
      '@get("/fragment", {selector: null, responseOverrides: {"selector": "#slot", "mode": "append", "namespace": "svg", "useViewTransition": true}})'
    )
  })
})
