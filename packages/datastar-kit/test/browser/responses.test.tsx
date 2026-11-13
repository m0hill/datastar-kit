import { describe, expect, it } from "vitest"
import { del, get, js, patch, post, put, query as queryAction, signal } from "../../src/ds/index.js"
import { datastarAtLeast, mount, query, signalValue, text } from "./datastar.js"

declare global {
  interface Window {
    scriptResult?: string
  }
}

// Real Datastar consuming responses built by `read`, `reply`, and `event` in fixture-server.ts.
describe("Datastar responses", () => {
  it("delivers signals to read.signals for every fetch method", async () => {
    const methods = { get, post, put, patch, delete: del } as const

    await mount(
      <main data-signals={{ count: 7, echo: { get: 0, post: 0, put: 0, patch: 0, delete: 0 } }}>
        {Object.entries(methods).map(([method, action]) => (
          <button
            id={`send-${method}`}
            type="button"
            data-on:click={action("/fixtures/echo")}
          />
        ))}
      </main>
    )

    for (const method of Object.keys(methods)) {
      query(`#send-${method}`).click()
      await expect.poll(() => signalValue(`echo.${method}`)).toBe(7)
    }
  })

  it.skipIf(!datastarAtLeast("1.0.4"))(
    "delivers signals to read.signals in the body of a QUERY request",
    async () => {
      await mount(
        <main data-signals={{ count: 7, echo: { query: 0 } }}>
          <button
            id="send-query"
            type="button"
            data-on:click={queryAction("/fixtures/echo")}
          />
        </main>
      )

      query("#send-query").click()
      await expect.poll(() => signalValue("echo.query")).toBe(7)
    }
  )

  it("applies element, removal, signal, and script events from one stream", async () => {
    delete window.scriptResult

    await mount(
      <main data-signals={{ streamed: { ok: false } }}>
        <button
          id="stream"
          type="button"
          data-on:click={post("/fixtures/stream")}
        />
        <ul id="list">
          <li>before</li>
        </ul>
        <p id="gone">remove me</p>
      </main>
    )

    query("#stream").click()

    await expect.poll(() => window.scriptResult).toBe("</script><!--ok")
    expect(query("#list li").textContent).toBe("first\nsecond")
    expect(document.querySelector("#gone")).toBeNull()
    expect(signalValue("streamed.ok")).toBe(true)
    expect(document.querySelectorAll("body script")).toHaveLength(0)
  })

  it("applies every patch mode and the SVG namespace", async () => {
    await mount(
      <main>
        <button
          id="modes"
          type="button"
          data-on:click={post("/fixtures/modes")}
        />
        <div id="inner">old</div>
        <ul id="items">
          <li>existing</li>
        </ul>
        <div id="replace-me">old</div>
        <svg id="icon"></svg>
      </main>
    )

    query("#modes").click()

    await expect.poll(() => document.querySelector("#dot")).not.toBeNull()
    expect(query("#inner").innerHTML).toBe("<b>inner</b>")
    expect(Array.from(query("#items").children).map((item) => item.textContent)).toEqual([
      "prepended",
      "existing",
      "appended"
    ])
    expect(query("#items").previousElementSibling?.id).toBe("before")
    expect(query("#items").nextElementSibling?.id).toBe("after")
    expect(document.querySelector("#replace-me")).toBeNull()
    expect(text("#replaced")).toBe("new")
    expect(document.querySelector("#dot")?.namespaceURI).toBe("http://www.w3.org/2000/svg")
  })

  it("only adds missing signals when onlyIfMissing is set", async () => {
    await mount(
      <main data-signals={{ kept: "original" }}>
        <button
          id="sse"
          type="button"
          data-on:click={post("/fixtures/signals-if-missing")}
        />
      </main>
    )

    query("#sse").click()

    await expect.poll(() => signalValue("added")).toBe("new")
    expect(signalValue("kept")).toBe("original")
  })

  it("navigates the browser with reply.navigate", async () => {
    // A hash-only target keeps the test page loaded while proving the navigation script ran.
    const target = `${location.pathname}${location.search}#navigated`
    await mount(
      <button
        id="navigate"
        type="button"
        data-on:click={get(`/fixtures/navigate?to=${encodeURIComponent(target)}`)}
      />
    )

    query("#navigate").click()

    await expect.poll(() => location.hash).toBe("#navigated")
    history.replaceState(null, "", `${location.pathname}${location.search}`)
  })

  it("tracks in-flight requests with data-indicator", async () => {
    const saving = signal<boolean, "saving">("saving")

    await mount(
      <button
        id="held"
        type="button"
        data-indicator={saving}
        data-attr:aria-busy={js`${saving}`}
        data-on:click={post(`/fixtures/held?key=${__DATASTAR_VERSION__}`)}
      />
    )

    expect(signalValue("saving")).toBe(false)
    query("#held").click()
    await expect.poll(() => signalValue("saving")).toBe(true)
    expect(query("#held").getAttribute("aria-busy")).toBe("")

    await fetch(`/fixtures/release?key=${__DATASTAR_VERSION__}`)
    await expect.poll(() => signalValue("saving")).toBe(false)
    expect(query("#held").hasAttribute("aria-busy")).toBe(false)
  })
})
