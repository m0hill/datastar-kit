import { describe, expect, it } from "vitest"
import * as ds from "../src/ds.js"

if (false) {
  // Structured Datastar actions intentionally support only the default JSON signal transport.
  // Use ds.expr("@post('/upload', { contentType: 'form' })") and Effect Platform form readers for form uploads.
  // @ts-expect-error Form transport is an explicit expression escape hatch, not a structured FetchOptions field.
  ds.post("/upload", { contentType: "form" })
}

describe("Datastar typed helper coverage", () => {
  it("covers public thin mirrors of core attributes and modifiers", () => {
    expect(ds.effect(ds.expr("$foo = $bar"))).toEqual({
      "data-effect": "$foo = $bar"
    })

    expect(ds.init(ds.post("/load"), { delay: 500, viewTransition: true })).toEqual({
      "data-init__delay.500ms__viewtransition": '@post("/load")'
    })

    expect(ds.bind("is-checked", { case: "camel", prop: "checked", events: ["input", "change"] })).toEqual({
      "data-bind:is-checked__case.camel__prop.checked__event.input.change": true
    })

    expect(ds.ref("panel")).toEqual({ "data-ref:panel": true })
    expect(ds.indicator("fetching")).toEqual({ "data-indicator:fetching": true })

    expect(ds.dataClass("my-class", ds.expr("$active"), { case: "camel" })).toEqual({
      "data-class:my-class__case.camel": "$active"
    })

    expect(ds.dataSignal("count", 0, { ifMissing: true })).toEqual({
      "data-signals:count__ifmissing": "0"
    })

    expect(ds.dataSignal("my-signal", 1, { case: "camel" })).toEqual({
      "data-signals:my-signal__case.camel": "1"
    })

    expect(ds.dataComputed("full-name", ds.expr("$first + ' ' + $last"), { case: "camel" })).toEqual({
      "data-computed:full-name__case.camel": "$first + ' ' + $last"
    })

    expect(ds.dataComputeds({ fullName: ds.expr<ds.DatastarFunction<unknown>>("() => $first + ' ' + $last") })).toEqual({
      "data-computed": `{"fullName": () => $first + ' ' + $last}`
    })
  })

  it("covers public action mirrors and fetch response overrides", () => {
    expect(ds.peek(ds.expr<ds.DatastarFunction<string>>("() => $bar")).toDatastarExpression()).toBe("@peek(() => $bar)")
    expect(ds.setAll(true, { include: ds.regex("^foo$") }).toDatastarExpression()).toBe(
      '@setAll(true, {"include": /^foo$/})'
    )
    expect(ds.toggleAll({ exclude: ds.regex("_temp$") }).toDatastarExpression()).toBe(
      '@toggleAll({"exclude": /_temp$/})'
    )
    expect(ds.delete("/items/1").toDatastarExpression()).toBe('@delete("/items/1")')
    expect(
      ds.get("/fragment", {
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
