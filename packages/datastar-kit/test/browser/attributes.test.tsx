import { describe, expect, it } from "vitest"
import { js, local, mod, regex, signal, state } from "../../src/ds/index.js"
import { mount, query, signalValue, text, typeInto } from "./datastar.js"

// Real Datastar applying attributes rendered by the JSX runtime. Each test uses its own signal
// names because Datastar's signal store lives for the whole test file.
describe("Datastar attributes rendered by JSX", () => {
  it("initializes signals from structured values, keys, and state defaults", async () => {
    const form = state({ profile: { name: "Ada" }, tags: ["admin"] })

    await mount(
      <main
        data-signals={{
          quoted: `He said "hi" & <left>`,
          nested: { items: ["a", 1, true], none: null },
          shape: { toDatastarExpression: "plain data" }
        }}
        data-signals:zero={0}
        data-signals:off={false}
      >
        <div data-signals={form.defaults} />
        <div data-signals:greeting={js`${"Hello, "} + ${form.refs.profile.name}`} />
      </main>
    )

    expect(signalValue("quoted")).toBe(`He said "hi" & <left>`)
    expect(signalValue("nested.items")).toEqual(["a", 1, true])
    expect(signalValue("shape.toDatastarExpression")).toBe("plain data")
    expect(signalValue("zero")).toBe(0)
    expect(signalValue("off")).toBe(false)
    expect(signalValue("profile.name")).toBe("Ada")
    expect(signalValue("tags")).toEqual(["admin"])
    expect(signalValue("greeting")).toBe("Hello, Ada")
  })

  it("removes signals patched with null and keeps existing ones with ifMissing", async () => {
    await mount(
      <main data-signals={{ temporary: 1, kept: "original" }}>
        <div data-signals={{ temporary: null }} />
        <div data-signals={mod({ kept: "replaced", added: "new" }, { ifMissing: true })} />
        <div data-signals:kept={mod(js`${"keyed"}`, { ifMissing: true })} />
      </main>
    )

    expect(signalValue("temporary")).toBeUndefined()
    expect(signalValue("kept")).toBe("original")
    expect(signalValue("added")).toBe("new")
  })

  it("renders text, visibility, classes, attributes, and styles reactively", async () => {
    const label = signal<string, "label">("label")
    const open = signal<boolean, "open">("open")
    const opacity = signal<number, "opacity">("opacity")

    await mount(
      <main data-signals={{ label: "Ada", open: false, opacity: 0 }}>
        <output
          id="text"
          data-text={label}
        />
        <section
          id="panel"
          data-show={open}
          data-class={{ "is-open": open, closed: js`!${open}` }}
          data-class:has-label={label}
          data-attr={{ "aria-label": label, "aria-expanded": js`${open} ? "true" : "false"` }}
          data-attr:hidden={js`!${open}`}
          data-style={{ backgroundColor: js`${open} ? "red" : ""` }}
          data-style:opacity={opacity}
        />
        <p
          id="never"
          data-show={false}
        />
        <button
          id="toggle"
          type="button"
          data-on:click={js<void>`${open} = !${open}; ${label} = ${"Grace & co"}`}
        />
      </main>
    )

    const panel = query("#panel")
    expect(text("#text")).toBe("Ada")
    expect(panel.style.display).toBe("none")
    expect(Array.from(panel.classList)).toEqual(["closed", "has-label"])
    expect(panel.getAttribute("aria-label")).toBe("Ada")
    expect(panel.getAttribute("aria-expanded")).toBe("false")
    expect(panel.hasAttribute("hidden")).toBe(true)
    expect(panel.style.opacity).toBe("0")
    expect(query("#never").style.display).toBe("none")

    query("#toggle").click()

    expect(text("#text")).toBe("Grace & co")
    expect(panel.style.display).toBe("")
    expect(Array.from(panel.classList)).toEqual(["has-label", "is-open"])
    expect(panel.getAttribute("aria-expanded")).toBe("true")
    expect(panel.hasAttribute("hidden")).toBe(false)
    expect(panel.style.backgroundColor).toBe("red")
  })

  it("binds signal refs, keyed names, custom events, and custom properties", async () => {
    const query_ = signal<string, "search">("search")
    const draft = signal<string, "draft">("draft")
    const expanded = signal<boolean, "expanded">("expanded")

    await mount(
      <main data-signals={{ search: "", draft: "", expanded: false }}>
        <input
          id="search"
          data-bind={query_}
        />
        <input
          id="first-name"
          data-bind:first-name
        />
        <input
          id="last-name"
          data-bind:last-name={mod({ case: "snake" })}
        />
        <input
          id="draft"
          data-bind={mod(draft, { event: "change" })}
        />
        <details
          id="details"
          data-bind={mod(expanded, { prop: "open", event: "toggle" })}
        >
          <summary>More</summary>
        </details>
      </main>
    )

    typeInto("#search", "datastar")
    typeInto("#first-name", "Ada")
    typeInto("#last-name", "Lovelace")
    expect(signalValue("search")).toBe("datastar")
    expect(signalValue("firstName")).toBe("Ada")
    expect(signalValue("last_name")).toBe("Lovelace")

    typeInto("#draft", "typed", "input")
    expect(signalValue("draft")).toBe("")
    typeInto("#draft", "committed", "change")
    expect(signalValue("draft")).toBe("committed")

    query("#details").setAttribute("open", "")
    await expect.poll(() => signalValue("expanded")).toBe(true)
  })

  it("stores element refs and derives computed signals", async () => {
    const count = signal<number, "count">("count")

    await mount(
      <main
        data-signals={{ count: 2 }}
        data-computed:double={js`${count} * 2`}
        data-computed={{ totals: { triple: js`() => ${count} * 3` } }}
      >
        <canvas
          id="canvas"
          data-ref={signal<HTMLCanvasElement, "canvas">("canvas")}
        />
        <div
          id="keyed-ref"
          data-ref:keyed-ref
        />
        <button
          id="increment"
          type="button"
          data-on:click={js<void>`${count}++`}
        />
      </main>
    )

    expect(signalValue("canvas")).toBe(query("#canvas"))
    expect(signalValue("keyedRef")).toBe(query("#keyed-ref"))
    expect(signalValue("double")).toBe(4)
    expect(signalValue("totals.triple")).toBe(6)

    query("#increment").click()
    expect(signalValue("double")).toBe(6)
    expect(signalValue("totals.triple")).toBe(9)
  })

  it("runs init and effect expressions", async () => {
    const source = signal<number, "source">("source")
    const mirror = signal<number, "mirror">("mirror")

    await mount(
      <main
        data-signals={{ source: 0, mirror: -1 }}
        data-init={js<void>`${source} = ${5}`}
        data-effect={js<void>`${mirror} = ${source} * 10`}
      />
    )

    expect(signalValue("mirror")).toBe(50)
  })

  it("skips data-ignore subtrees and only the element itself with __self", async () => {
    await mount(
      <main data-signals={{ shown: "applied" }}>
        <div data-ignore>
          <output
            id="ignored-child"
            data-text="$shown"
          >
            raw
          </output>
        </div>
        <output
          id="ignored-self"
          data-ignore={mod({ self: true })}
          data-text="$shown"
        >
          raw
          <span
            id="processed-child"
            data-text="$shown"
          />
        </output>
      </main>
    )

    expect(text("#ignored-child")).toBe("raw")
    expect(query("#ignored-self").firstChild?.textContent?.trim()).toBe("raw")
    expect(text("#processed-child")).toBe("applied")
  })

  it("filters signals with regular expressions in data-json-signals", async () => {
    await mount(
      <main data-signals={{ counter: 1, counterTemp: 2, other: 3, _private: 4 }}>
        <pre
          id="filtered"
          data-json-signals={mod({ include: /^counter/, exclude: regex("Temp$") }, { terse: true })}
        />
      </main>
    )

    expect(JSON.parse(text("#filtered") ?? "")).toEqual({ counter: 1 })
    expect(text("#filtered")).toBe('{"counter":1}')
  })

  it("reacts to signal patches matching data-on-signal-patch-filter", async () => {
    const watched = signal<number, "watched">("watched")
    const changes = local<number>("changes")

    await mount(
      <main
        data-signals={{ watched: 0, unwatched: 0, _changes: 0 }}
        data-on-signal-patch={js<void>`${changes}++`}
        data-on-signal-patch-filter={{ include: /^watched$/ }}
      >
        <button
          id="watched"
          type="button"
          data-on:click={js<void>`${watched}++`}
        />
        <button
          id="unwatched"
          type="button"
          data-on:click="$unwatched++"
        />
      </main>
    )

    query("#unwatched").click()
    query("#watched").click()

    await expect.poll(() => signalValue("_changes")).toBe(1)
    expect(signalValue("unwatched")).toBe(1)
  })
})
