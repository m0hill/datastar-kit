import { describe, expect, it } from "vitest"
import { signal, signals } from "../src/datastar.js"
import type { Handler } from "../src/handler.js"
import { createNodeListener, serve } from "../src/node.js"

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

  const needsEnvironment = undefined as unknown as Handler<never, { readonly config: string }>
  // @ts-expect-error Node runtime helpers can only run handlers with no remaining Effect context
  createNodeListener(needsEnvironment)
  // @ts-expect-error serve cannot erase an unprovided Effect environment
  serve(needsEnvironment)
}

describe("compile-time signal safety", () => {
  it("keeps typed signal helpers usable at runtime", () => {
    expect(signal<number, "count">("count").add(1).toDatastarExpression()).toBe("$count++")
  })
})
