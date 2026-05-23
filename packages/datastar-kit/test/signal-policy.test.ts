import { describe, expect, it } from "vitest"
import * as ds from "../src/ds/index.js"
import { h, renderToString } from "../src/html.js"

describe("signal policy helpers", () => {
  it("keeps posted input signals explicit without changing Datastar names", () => {
    const email = ds.signal<string, "email">("email")

    expect(email.toDatastarExpression()).toBe("$email")
    expect(ds.bind(email)).toEqual({ "data-bind": "email" })
    expect(ds.bind("projectName")).toEqual({ "data-bind": "projectName" })
  })

  it("uses one canonical local signal helper for underscore-prefixed signals", () => {
    const menuOpen = ds.local<boolean, "menuOpen">("menuOpen")
    const alreadyLocal = ds.local<boolean, "_dialogOpen">("_dialogOpen")

    expect(menuOpen.toDatastarExpression()).toBe("$_menuOpen")
    expect(alreadyLocal.toDatastarExpression()).toBe("$_dialogOpen")
    expect(ds.dataSignal("_menuOpen", false, { ifMissing: true })).toEqual({
      "data-signals:_menu-open__ifmissing": "false"
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
    expect(ds.indicator(saving)).toEqual({ "data-indicator": "_loading.save" })
  })

  it("keeps keyed casing modifiers available for native Datastar keyed syntax", () => {
    expect(ds.bind("project-name", { case: "camel" })).toEqual({
      "data-bind:project-name__case.camel": true
    })
    expect(ds.dataSignal("project-name", "", { case: "camel", ifMissing: true })).toEqual({
      "data-signals:project-name__case.camel__ifmissing": '""'
    })
    expect(ds.dataComputed("project-name", ds.expr("$name.trim()"), { case: "camel" })).toEqual({
      "data-computed:project-name__case.camel": "$name.trim()"
    })
  })

  it("uses case-preserving Datastar forms for camelCase signal names", () => {
    expect(ds.ref("projectName")).toEqual({ "data-ref": "projectName" })
    expect(ds.indicator("isSaving")).toEqual({ "data-indicator": "isSaving" })
    expect(ds.dataSignal("projectName", "")).toEqual({
      "data-signals:project-name": '""'
    })
    expect(ds.dataComputed("projectName", ds.expr("$name.trim()"))).toEqual({
      "data-computed:project-name": "$name.trim()"
    })
  })

  it("keeps singular signal helpers composable on one element", () => {
    expect({
      ...ds.dataSignal("projectName", ""),
      ...ds.dataSignal("projectKey", "")
    }).toEqual({
      "data-signals:project-name": '""',
      "data-signals:project-key": '""'
    })
    expect({
      ...ds.dataComputed("fullName", ds.expr("$firstName + ' ' + $lastName")),
      ...ds.dataComputed("initials", ds.expr("$firstName[0] + $lastName[0]"))
    }).toEqual({
      "data-computed:full-name": "$firstName + ' ' + $lastName",
      "data-computed:initials": "$firstName[0] + $lastName[0]"
    })
  })

  it("falls back to object form when keyed attributes cannot preserve exact casing", () => {
    expect(ds.dataSignal("ProjectName", "")).toEqual({
      "data-signals": '{"ProjectName": ""}'
    })
    expect(ds.dataComputed("ProjectName", ds.expr("$name.trim()"))).toEqual({
      "data-computed": '{"ProjectName": () => $name.trim()}'
    })
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
      '<details data-signals:_menu-open__ifmissing="false"><summary>Menu</summary><div data-show="$_menuOpen">Panel</div></details>'
    )
  })
})
