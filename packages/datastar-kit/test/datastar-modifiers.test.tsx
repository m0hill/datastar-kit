import { describe, expect, it } from "vitest"
import { mod, post } from "../src/ds/index.js"
import { renderToString } from "../src/html.js"
import { jsx as runtimeJsx } from "../src/jsx-runtime.js"

const save = post("/save")

// Bypasses the compile-time attribute types to exercise the runtime checks that protect
// JavaScript callers and loosely typed props.
const renderModified = (name: string, value: unknown): string =>
  renderToString(runtimeJsx("div", { [name]: value }))

// How Datastar applies rendered modifiers is checked against the real runtime in
// test/browser/modifiers.test.tsx. This file covers the server-side validation that rejects
// modifiers before any markup is produced.
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
