import { describe, expect, it } from "vitest"
import { signal, signals } from "../src/datastar.js"

if (false) {
  const count = signal<number, "count">("count")
  const enabled = signal<boolean, "enabled">("enabled")
  const $ = signals<{ count: number; enabled: boolean }>()

  count.add(1)
  enabled.toggle()
  $.count.set(1)

  // @ts-expect-error number signals cannot be assigned strings
  count.set("nope")

  // @ts-expect-error boolean signals cannot use numeric increments
  enabled.add(1)

  // @ts-expect-error signal records only expose declared signal names
  $.missing
}

describe("compile-time signal safety", () => {
  it("keeps typed signal helpers usable at runtime", () => {
    expect(signal<number, "count">("count").add(1).toDatastarExpression()).toBe("$count++")
  })
})
