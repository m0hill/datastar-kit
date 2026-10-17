import { expect, it } from "vitest"
import { post, signal } from "../../src/ds/index.js"
import { h } from "../../src/html.js"
import { loadDatastar, mount, nextFetchFinished, query } from "./datastar.js"

it("applies 200 direct JSON signal responses and ignores non-200 action bodies", async () => {
  const count = signal<number, "count">("count")
  mount(
    h(
      "main",
      { "data-signals__ifmissing": '{"count": 0}' },
      h("output", { id: "count", "data-text": count.toDatastarExpression() }),
      h(
        "button",
        {
          id: "ignored",
          type: "button",
          "data-on:click": post("/fixtures/runtime/ignored").toDatastarExpression()
        },
        "ignored"
      ),
      h(
        "button",
        {
          id: "increment",
          type: "button",
          "data-on:click": post("/fixtures/runtime/increment").toDatastarExpression()
        },
        "+"
      )
    )
  )
  await loadDatastar()
  await expect.poll(() => query("#count").textContent).toBe("0")

  const ignored = nextFetchFinished()
  query("#ignored").click()
  await ignored
  expect(query("#count").textContent).toBe("0")

  query("#increment").click()
  await expect.poll(() => query("#count").textContent).toBe("1")
})
