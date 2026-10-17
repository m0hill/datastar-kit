import { describe, expect, it } from "vitest"
import { js, mod, post } from "../src/ds/index.js"
import { renderToString } from "../src/html.js"
import { jsx as runtimeJsx } from "../src/jsx-runtime.js"

const save = post("/save")

// Bypasses the compile-time attribute types to exercise the runtime checks that protect
// JavaScript callers and loosely typed props.
const renderModified = (name: string, value: unknown): string =>
  renderToString(runtimeJsx("div", { [name]: value }))

describe("Datastar modifier rendering", () => {
  it("renders flag modifiers as suffixes in authored order", () => {
    expect(
      renderToString(
        <button data-on:click={mod(save, { once: true, prevent: true, window: true })} />
      )
    ).toBe('<button data-on:click__once__prevent__window="@post(&quot;/save&quot;)"></button>')
  })

  it("omits modifiers set to false", () => {
    expect(
      renderToString(<button data-on:click={mod(save, { once: false, prevent: true })} />)
    ).toBe('<button data-on:click__prevent="@post(&quot;/save&quot;)"></button>')
  })

  it("lowercases camel-cased modifier names the way Datastar spells them", () => {
    expect(
      renderToString(
        <div>
          <div data-signals={mod({ ready: false }, { ifMissing: true })} />
          <button data-on:click={mod(save, { viewTransition: true })} />
        </div>
      )
    ).toBe(
      '<div><div data-signals__ifmissing="{&quot;ready&quot;: false}"></div><button data-on:click__viewtransition="@post(&quot;/save&quot;)"></button></div>'
    )
  })

  it("appends ms to bare numeric durations and keeps unit strings", () => {
    const init = js<void>("$ready = true")

    expect(
      renderToString(
        <div>
          <div data-init={mod(init, { delay: 500 })} />
          <div data-init={mod(init, { delay: "500" })} />
          <div data-init={mod(init, { delay: "1s" })} />
          <div data-init={mod(init, { delay: true })} />
        </div>
      )
    ).toBe(
      '<div><div data-init__delay.500ms="$ready = true"></div><div data-init__delay.500ms="$ready = true"></div><div data-init__delay.1s="$ready = true"></div><div data-init__delay="$ready = true"></div></div>'
    )
  })

  it("renders debounce and throttle edge options as modifier tags", () => {
    expect(
      renderToString(
        <div>
          <input data-on:input={mod(save, { debounce: "200ms" })} />
          <input
            data-on:input={mod(save, {
              debounce: { duration: "1s", leading: true, noTrailing: true }
            })}
          />
          <input
            data-on:input={mod(save, {
              throttle: { duration: 250, noLeading: true, trailing: true }
            })}
          />
        </div>
      )
    ).toBe(
      '<div><input data-on:input__debounce.200ms="@post(&quot;/save&quot;)"><input data-on:input__debounce.1s.leading.notrailing="@post(&quot;/save&quot;)"><input data-on:input__throttle.250ms.noleading.trailing="@post(&quot;/save&quot;)"></div>'
    )
  })

  it("renders value-tagged modifiers", () => {
    const seen = js<void>("$seen = true")

    expect(
      renderToString(
        <div>
          <input data-bind={mod("accepted", { prop: "checked", event: ["input", "change"] })} />
          <input data-bind:is-on={mod({ case: "camel", event: "change" })} />
          <div data-on-intersect={mod(seen, { threshold: 25 })} />
          <pre data-json-signals={mod({ terse: true })} />
          <div data-ignore={mod({ self: true })} />
        </div>
      )
    ).toBe(
      '<div><input data-bind__prop.checked__event.input.change="accepted"><input data-bind:is-on__case.camel__event.change><div data-on-intersect__threshold.25="$seen = true"></div><pre data-json-signals__terse></pre><div data-ignore__self></div></div>'
    )
  })

  it("puts the interval duration and its leading tag first", () => {
    expect(
      renderToString(
        <div
          data-on-interval={mod(js<void>("$count++"), {
            viewTransition: true,
            leading: true,
            duration: 500
          })}
        />
      )
    ).toBe('<div data-on-interval__duration.500ms.leading__viewtransition="$count++"></div>')
  })
})

describe("Datastar modifier validation", () => {
  it("rejects modifiers the attribute does not support", () => {
    expect(() => renderModified("data-signals", mod({ ready: false }, { prevent: true }))).toThrow(
      'Datastar modifier "prevent" is not valid on "data-signals"'
    )
    expect(() => renderModified("data-on-interval", mod("$count++", { delay: 500 }))).toThrow(
      'Datastar modifier "delay" is not valid on "data-on-interval"'
    )
  })

  it("applies case modifiers only to keyed forms", () => {
    expect(() => renderModified("data-bind", mod("fooBar", { case: "kebab" }))).toThrow(
      'Datastar modifier "case" is not valid on "data-bind"'
    )
    expect(renderModified("data-bind:foo-bar", mod({ case: "kebab" }))).toBe(
      "<div data-bind:foo-bar__case.kebab></div>"
    )
  })

  it("rejects modifier wrappers on attributes without modifiers", () => {
    expect(() => renderModified("data-show", mod("$open", { once: true }))).toThrow(
      'Datastar attribute "data-show" does not accept modifiers'
    )
    expect(() => renderModified("data-on", mod("$open", { prevent: true }))).toThrow(
      'Datastar attribute "data-on" does not accept modifiers'
    )
    expect(() => renderModified("data-tooltip", mod("$open", { once: true }))).toThrow(
      'Datastar attribute "data-tooltip" does not accept modifiers'
    )
  })

  it("rejects unknown modifiers and malformed modifier values", () => {
    // JavaScript callers can pass modifier bags that the types reject.
    // @ts-expect-error Unknown modifier name.
    const unknown = mod(save, { preevent: true })
    // @ts-expect-error Flag modifiers take booleans.
    const nonBooleanFlag = mod(save, { prevent: "yes" })
    // @ts-expect-error Unsupported case conversion.
    const unsupportedCase = mod(save, { case: "upper" })
    // @ts-expect-error Durations are numbers or strings.
    const objectDelay = mod(save, { delay: {} })
    // @ts-expect-error Structured timing options require a duration.
    const missingDuration = mod(save, { debounce: { leading: true } })

    expect(() => renderModified("data-on:click", unknown)).toThrow(
      'Unknown Datastar modifier "preevent"'
    )
    expect(() => renderModified("data-on:click", nonBooleanFlag)).toThrow(
      'Datastar modifier "prevent" expects a boolean value'
    )
    expect(() => renderModified("data-on:click", unsupportedCase)).toThrow(
      'Datastar modifier "case" received unsupported value'
    )
    expect(() => renderModified("data-on:click", objectDelay)).toThrow(
      "Unsupported Datastar duration modifier value"
    )
    expect(() => renderModified("data-on:click", missingDuration)).toThrow(
      'Datastar modifier "debounce" requires a duration'
    )
  })

  it("requires a modifier object", () => {
    // @ts-expect-error Modifiers must be an object.
    expect(() => mod(save, "prevent")).toThrow("Datastar modifiers must be an object")
    // @ts-expect-error The one-argument form takes a modifier object.
    expect(() => mod("prevent")).toThrow("Datastar modifiers must be an object")
  })
})
