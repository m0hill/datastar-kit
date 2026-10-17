import { describe, expect, it } from "vitest"
import { del, get, js, patch, post, put, signal } from "../../src/ds/index.js"
import { mount, query, signalValue, text } from "./datastar.js"

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

  it("keeps attributes listed in data-preserve-attr when the server morphs an element", async () => {
    await mount(
      <main>
        <button
          id="morph"
          type="button"
          data-on:click={post("/fixtures/preserve")}
        />
        <details
          id="details"
          data-preserve-attr="open"
        >
          <summary>client</summary>
        </details>
      </main>
    )

    query("#details").setAttribute("open", "")
    query("#morph").click()

    await expect.poll(() => text("#details summary")).toBe("server")
    expect(query("#details").hasAttribute("open")).toBe(true)
  })

  it("only adds missing signals when onlyIfMissing is set", async () => {
    await mount(
      <main data-signals={{ kept: "original", directKept: "original" }}>
        <button
          id="sse"
          type="button"
          data-on:click={post("/fixtures/signals-if-missing")}
        />
        <button
          id="direct"
          type="button"
          data-on:click={post("/fixtures/direct-signals-if-missing")}
        />
      </main>
    )

    query("#sse").click()
    query("#direct").click()

    await expect.poll(() => signalValue("added")).toBe("new")
    await expect.poll(() => signalValue("directAdded")).toBe("new")
    expect(signalValue("kept")).toBe("original")
    expect(signalValue("directKept")).toBe("original")
  })

  it("applies direct HTML and direct signal responses", async () => {
    await mount(
      <main data-signals={{ direct: "pending" }}>
        <button
          id="direct-html"
          type="button"
          data-on:click={get("/fixtures/direct-html")}
        />
        <button
          id="direct-signals"
          type="button"
          data-on:click={get("/fixtures/direct-signals")}
        />
        <div id="direct-slot">empty</div>
      </main>
    )

    query("#direct-html").click()
    query("#direct-signals").click()

    await expect.poll(() => query("#direct-slot").innerHTML).toBe("<p>patched</p>")
    await expect.poll(() => signalValue("direct")).toBe("applied")
  })

  it("tracks in-flight requests with data-indicator", async () => {
    const saving = signal<boolean, "saving">("saving")

    await mount(
      <button
        id="held"
        type="button"
        data-indicator={saving}
        data-attr:aria-busy={js`${saving}`}
        data-on:click={post("/fixtures/held")}
      />
    )

    expect(signalValue("saving")).toBe(false)
    query("#held").click()
    await expect.poll(() => signalValue("saving")).toBe(true)
    expect(query("#held").getAttribute("aria-busy")).toBe("")

    await fetch("/fixtures/release")
    await expect.poll(() => signalValue("saving")).toBe(false)
    expect(query("#held").hasAttribute("aria-busy")).toBe(false)
  })
})
