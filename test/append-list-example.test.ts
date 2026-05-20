import { describe, expect, it } from "vitest"
import { makeAppendList } from "../examples/append-list.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("append list example", () => {
  it("renders a Datastar append-list page", async () => {
    const appendList = makeAppendList()
    const response = appendList.handle(new Request("http://localhost/"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
    expect(html).toContain("Append list")
    expect(html).toContain('<button type="button" data-on:click="@post(&quot;/items&quot;)">Add item</button>')
    expect(html).toContain('<ul id="items"></ul>')
  })

  it("appends new items into the list target with an explicit selector", async () => {
    const appendList = makeAppendList()

    const first = appendList.handle(new Request("http://localhost/items", { method: "POST" }))
    const second = appendList.handle(new Request("http://localhost/items", { method: "POST" }))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(appendList.currentItems()).toEqual([
      { id: 1, label: "Item 1" },
      { id: 2, label: "Item 2" }
    ])
    expect(await first.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #items\ndata: mode append\ndata: elements <li id="item-1">Item 1</li>\n\n'
    )
    expect(await second.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #items\ndata: mode append\ndata: elements <li id="item-2">Item 2</li>\n\n'
    )
  })

  it("returns a normal 404 response for unknown routes", async () => {
    const appendList = makeAppendList()
    const response = appendList.handle(new Request("http://localhost/missing"))

    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Not Found")
  })
})
