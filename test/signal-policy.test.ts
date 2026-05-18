import { describe, expect, it } from "vitest"
import {
  bind,
  indicator,
  inputSignal,
  loadingDataSignal,
  loadingSignal,
  localSignal,
  privateDataSignal,
  privateSignal,
  privateSignalName,
  show,
  validationDataSignal,
  validationSignal
} from "../src/datastar.js"
import { h, render } from "../src/html.js"

describe("signal policy helpers", () => {
  it("makes posted input signals explicit without changing Datastar names", () => {
    const email = inputSignal<string, "email">("email")

    expect(email.toDatastarExpression()).toBe("$email")
    expect(bind(email)).toEqual({ "data-bind:email": true })
  })

  it("prefixes private/local signal names so they are excluded from default Datastar requests", () => {
    const menuOpen = privateSignal<boolean, "menuOpen">("menuOpen")
    const alreadyPrivate = localSignal<boolean, "_dialogOpen">("_dialogOpen")

    expect(privateSignalName("menuOpen")).toBe("_menuOpen")
    expect(menuOpen.toDatastarExpression()).toBe("$_menuOpen")
    expect(alreadyPrivate.toDatastarExpression()).toBe("$_dialogOpen")
    expect(privateDataSignal("menuOpen", false, { ifMissing: true })).toEqual({
      "data-signals:_menuOpen__ifmissing": "false"
    })
  })

  it("provides conventional validation and loading signal scopes", () => {
    const emailError = validationSignal("email")
    const saving = loadingSignal("save")

    expect(emailError.toDatastarExpression()).toBe("$_validation.email")
    expect(saving.toDatastarExpression()).toBe("$_loading.save")
    expect(validationDataSignal("email", "Required")).toEqual({
      "data-signals:_validation.email": '"Required"'
    })
    expect(loadingDataSignal("save", false)).toEqual({
      "data-signals:_loading.save": "false"
    })
    expect(indicator(saving)).toEqual({ "data-indicator:_loading.save": true })
  })

  it("keeps local disclosure state visibly private in rendered HTML", () => {
    const open = localSignal<boolean, "menuOpen">("menuOpen")
    const node = h(
      "details",
      privateDataSignal("menuOpen", false, { ifMissing: true }),
      h("summary", {}, "Menu"),
      h("div", show(open), "Panel")
    )

    expect(render(node)).toBe(
      '<details data-signals:_menuOpen__ifmissing="false"><summary>Menu</summary><div data-show="$_menuOpen">Panel</div></details>'
    )
  })
})
