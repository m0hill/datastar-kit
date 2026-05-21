import { describe, expect, it } from "vitest"
import * as ds from "../src/ds/index.js"
import { h, renderToString } from "../src/html.js"

describe("signal policy helpers", () => {
  it("keeps posted input signals explicit without changing Datastar names", () => {
    const email = ds.signal<string, "email">("email")

    expect(email.toDatastarExpression()).toBe("$email")
    expect(ds.bind(email)).toEqual({ "data-bind:email": true })
  })

  it("uses one canonical local signal helper for underscore-prefixed signals", () => {
    const menuOpen = ds.local<boolean, "menuOpen">("menuOpen")
    const alreadyLocal = ds.local<boolean, "_dialogOpen">("_dialogOpen")

    expect(menuOpen.toDatastarExpression()).toBe("$_menuOpen")
    expect(alreadyLocal.toDatastarExpression()).toBe("$_dialogOpen")
    expect(ds.dataSignal("_menuOpen", false, { ifMissing: true })).toEqual({
      "data-signals:_menuOpen__ifmissing": "false"
    })
  })

  it("keeps validation and loading conventions in app code instead of core helpers", () => {
    const emailError = ds.local<string, "validation.email">("validation.email")
    const saving = ds.local<boolean, "loading.save">("loading.save")

    expect(emailError.toDatastarExpression()).toBe("$_validation.email")
    expect(saving.toDatastarExpression()).toBe("$_loading.save")
    expect(ds.dataSignal("_validation.email", "Required")).toEqual({
      "data-signals:_validation.email": '"Required"'
    })
    expect(ds.dataSignal("_loading.save", false)).toEqual({
      "data-signals:_loading.save": "false"
    })
    expect(ds.indicator(saving)).toEqual({ "data-indicator:_loading.save": true })
  })

  it("keeps local disclosure state visibly private in rendered HTML", () => {
    const open = ds.local<boolean, "menuOpen">("menuOpen")
    const node = h(
      "details",
      ds.dataSignal("_menuOpen", false, { ifMissing: true }),
      h("summary", {}, "Menu"),
      h("div", ds.show(open), "Panel")
    )

    expect(renderToString(node)).toBe(
      '<details data-signals:_menuOpen__ifmissing="false"><summary>Menu</summary><div data-show="$_menuOpen">Panel</div></details>'
    )
  })
})
