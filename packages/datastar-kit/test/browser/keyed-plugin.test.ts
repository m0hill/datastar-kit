import { expect, it } from "vitest"
import { h } from "../../src/html.js"
import { loadDatastar, mount, query } from "./datastar.js"

interface KeyedPluginCall {
  readonly key: string
  readonly value: unknown
}

it("runs custom attribute plugins with keyed suffixes", async () => {
  mount(
    h("output", { id: "keyed-plugin", "data-keyed-check:item-name": '"from suffix"' }, "waiting")
  )
  const calls: KeyedPluginCall[] = []
  const { attribute } = await loadDatastar()

  attribute({
    name: "keyed-check",
    requirement: { key: "must", value: "must" },
    returnsValue: true,
    apply({ el, key, rx }: { el: HTMLElement; key: string; rx: () => unknown }) {
      const value = rx()
      el.textContent = `${key}:${String(value)}`
      calls.push({ key, value })
    }
  })

  await expect.poll(() => query("#keyed-plugin").textContent).toBe("item-name:from suffix")
  expect(query("#keyed-plugin").hasAttribute("data-keyed-check:item-name")).toBe(true)
  expect(calls).toEqual([{ key: "item-name", value: "from suffix" }])
})
