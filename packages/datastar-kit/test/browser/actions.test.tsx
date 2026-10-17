import { describe, expect, it } from "vitest"
import {
  action,
  get,
  js,
  peek,
  post,
  queryUrl,
  setAll,
  signal,
  toggleAll,
  type DatastarFunction
} from "../../src/ds/index.js"
import { mount, query, signalValue } from "./datastar.js"
import { action as registerAction } from "./vendor/datastar.js"

const inspected = (field: string): unknown => signalValue(`inspected.${field}`)

// The inspect route reports query strings and bodies as JSON text; null until it has responded.
const inspectedJson = (field: string): unknown => JSON.parse(String(inspected(field) ?? "null"))

// Real Datastar running action expressions built by the `ds` helpers. The /fixtures/inspect route
// reports what reached the server.
describe("Datastar actions built by ds helpers", () => {
  it("sends reactive query parameters before the fragment and keeps literal path text", async () => {
    const q = signal<string, "q">("q")
    const page = signal<number, "page">("page")

    await mount(
      <main data-signals={{ q: "a&b c", page: 2 }}>
        <button
          id="search"
          type="button"
          data-on:click={get(queryUrl("/fixtures/inspect?sort=name#results", { q, page }))}
        />
        <button
          id="open-query"
          type="button"
          data-on:click={get(queryUrl("/fixtures/inspect?", { page }))}
        />
        <button
          id="literal"
          type="button"
          data-on:click={get(queryUrl("/fixtures/inspect/`tick`/${section}", { q }))}
        />
      </main>
    )

    query("#search").click()
    await expect.poll(() => inspected("path")).toBe("/fixtures/inspect")
    expect(inspectedJson("query")).toEqual({ sort: "name", q: "a&b c", page: "2" })

    query("#open-query").click()
    await expect.poll(() => inspectedJson("query")).toEqual({ page: "2" })

    query("#literal").click()
    await expect.poll(() => inspected("path")).toBe("/fixtures/inspect/`tick`/${section}")
    expect(inspectedJson("query")).toEqual({ q: "a&b c" })
  })

  it("sends headers and filtered signals, or an explicit payload", async () => {
    const count = signal<number, "count">("count")

    await mount(
      <main data-signals={{ keepA: 1, keepB: 2, drop: 3, count: 4 }}>
        <button
          id="filtered"
          type="button"
          data-on:click={get("/fixtures/inspect", {
            headers: { "x-test": "sent" },
            filterSignals: { include: /^keep/ }
          })}
        />
        <button
          id="payload"
          type="button"
          data-on:click={post("/fixtures/inspect", { payload: { count, note: "hi" } })}
        />
      </main>
    )

    query("#filtered").click()
    await expect.poll(() => inspected("header")).toBe("sent")
    expect(inspectedJson("body")).toEqual({ keepA: 1, keepB: 2 })

    query("#payload").click()
    await expect.poll(() => inspectedJson("body")).toEqual({ count: 4, note: "hi" })
  })

  it("submits a selected form as URL-encoded form data", async () => {
    await mount(
      <main>
        <form id="profile">
          <input
            name="name"
            value="Ada Lovelace"
          />
        </form>
        <button
          id="submit"
          type="button"
          data-on:click={post("/fixtures/inspect", { contentType: "form", selector: "#profile" })}
        />
      </main>
    )

    query("#submit").click()
    await expect.poll(() => inspected("body")).toBe("name=Ada+Lovelace")
    expect(inspected("contentType")).toContain("application/x-www-form-urlencoded")
  })

  it("sets and toggles filtered signals", async () => {
    await mount(
      <main data-signals={{ flagA: false, flagB: true, other: false }}>
        <button
          id="set"
          type="button"
          data-on:click={setAll(true, { include: /^flag/ })}
        />
        <button
          id="toggle"
          type="button"
          data-on:click={toggleAll({ include: /^flag/ })}
        />
      </main>
    )

    query("#toggle").click()
    expect([signalValue("flagA"), signalValue("flagB"), signalValue("other")]).toEqual([
      true,
      false,
      false
    ])

    query("#set").click()
    expect([signalValue("flagA"), signalValue("flagB"), signalValue("other")]).toEqual([
      true,
      true,
      false
    ])
  })

  it("reads signals without subscribing through peek", async () => {
    const source = signal<number, "source">("source")
    const peeked = signal<number, "peeked">("peeked")
    const tracked = signal<number, "tracked">("tracked")

    await mount(
      <main data-signals={{ source: 1, peeked: 0, tracked: 0 }}>
        <div
          data-effect={js<void>`${peeked} = ${peek(js<DatastarFunction<number>>`() => ${source}`)}`}
        />
        <div data-effect={js<void>`${tracked} = ${source}`} />
        <button
          id="increment"
          type="button"
          data-on:click={js<void>`${source}++`}
        />
      </main>
    )

    query("#increment").click()

    expect(signalValue("tracked")).toBe(2)
    expect(signalValue("peeked")).toBe(1)
  })

  it("calls app-registered actions with serialized arguments", async () => {
    const calls: (readonly unknown[])[] = []
    registerAction({
      name: "record",
      apply: (_context, ...args) => {
        calls.push(args)
      }
    })
    const count = signal<number, "count">("count")

    await mount(
      <main data-signals={{ count: 5 }}>
        <button
          id="record"
          type="button"
          data-on:click={action("record", "clicked", count, { nested: [1, null] })}
        />
      </main>
    )

    query("#record").click()

    expect(calls).toEqual([["clicked", 5, { nested: [1, null] }]])
  })
})
