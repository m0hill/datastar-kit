import { beforeAll, describe, expect, it } from "vitest"
import { del, get, js, mod, post, put, signal } from "../../src/ds/index.js"
import { loadDatastar, mount, query, text } from "./datastar.js"

declare global {
  interface Window {
    scriptResult?: string
  }
}

// These tests run real Datastar against markup rendered by the JSX runtime and against responses
// built by `read`, `reply`, and `event` (see fixture-server.ts). They check that Datastar
// interprets our output as intended, which the string-level unit tests cannot show.
describe("Datastar runtime compatibility", () => {
  beforeAll(async () => {
    mount(<main />)
    await loadDatastar()
  })

  it("applies rendered signals, primitive expressions, presence attributes, and modifiers", async () => {
    const clicks = signal<number, "clicks">("clicks")
    const note = signal<string, "note">("note")

    mount(
      <main data-signals={{ clicks: 0, note: `He said "hi" & <left>` }}>
        <output
          id="clicks"
          data-text={clicks}
        />
        <output
          id="note"
          data-text={note}
        />
        <button
          id="once"
          type="button"
          data-on:click={mod(js<void>`${clicks} += ${1}`, { once: true })}
        />
        <p
          id="hidden"
          data-show={false}
        >
          hidden
        </p>
        <div data-ignore>
          <output
            id="ignored"
            data-text={clicks}
          >
            untouched
          </output>
        </div>
      </main>
    )

    await expect.poll(() => text("#clicks")).toBe("0")
    expect(text("#note")).toBe(`He said "hi" & <left>`)
    expect(query("#hidden").style.display).toBe("none")
    expect(text("#ignored")).toBe("untouched")

    query("#once").click()
    query("#once").click()
    await expect.poll(() => text("#clicks")).toBe("1")
  })

  it("delivers signals to read.signals for every fetch method", async () => {
    const methods = { get, post, put, delete: del } as const

    mount(
      <main data-signals={{ count: 7, echo: { get: 0, post: 0, put: 0, delete: 0 } }}>
        {Object.entries(methods).map(([method, action]) => (
          <>
            <button
              id={`send-${method}`}
              type="button"
              data-on:click={action("/fixtures/runtime/echo")}
            />
            <output
              id={`echo-${method}`}
              data-text={js`$echo.${js(method)}`}
            />
          </>
        ))}
      </main>
    )

    for (const method of Object.keys(methods)) {
      await expect.poll(() => text(`#echo-${method}`)).toBe("0")
      query(`#send-${method}`).click()
      await expect.poll(() => text(`#echo-${method}`)).toBe("7")
    }
  })

  it("applies element, removal, signal, and script events from reply.stream", async () => {
    delete window.scriptResult

    mount(
      <main data-signals={{ streamed: { ok: false } }}>
        <button
          id="stream"
          type="button"
          data-on:click={post("/fixtures/runtime/stream")}
        />
        <ul id="list">
          <li>before</li>
        </ul>
        <p id="gone">remove me</p>
        <output
          id="streamed"
          data-text={signal<boolean>("streamed.ok")}
        />
      </main>
    )

    await expect.poll(() => text("#streamed")).toBe("false")
    query("#stream").click()

    await expect.poll(() => window.scriptResult).toBe("</script><!--ok")
    expect(query("#list li").textContent).toBe("first\nsecond")
    expect(document.querySelector("#gone")).toBeNull()
    expect(text("#streamed")).toBe("true")
    expect(document.querySelectorAll("body script")).toHaveLength(0)
  })

  it("applies direct HTML and direct signal responses", async () => {
    mount(
      <main data-signals={{ direct: "pending" }}>
        <button
          id="direct-html"
          type="button"
          data-on:click={get("/fixtures/runtime/direct-html")}
        />
        <button
          id="direct-signals"
          type="button"
          data-on:click={get("/fixtures/runtime/direct-signals")}
        />
        <div id="direct-slot">empty</div>
        <output
          id="direct"
          data-text={signal<string>("direct")}
        />
      </main>
    )

    await expect.poll(() => text("#direct")).toBe("pending")
    query("#direct-html").click()
    await expect.poll(() => query("#direct-slot").innerHTML).toBe("<p>patched</p>")

    query("#direct-signals").click()
    await expect.poll(() => text("#direct")).toBe("applied")
  })
})
