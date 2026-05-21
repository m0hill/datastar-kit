import { describe, expect, it } from "vitest"
import * as event from "../src/event.js"
import { h, type HtmlChild } from "../src/html.js"
import { stream } from "../src/reply.js"
import type { PatchElementsOptions } from "../src/sse.js"

type View<State> = (state: State) => HtmlChild

interface QueryRecipeOptions<State> {
  readonly invalidations: AsyncIterable<unknown>
  readonly load: () => State | Promise<State>
  readonly render: View<State>
  readonly patch?: PatchElementsOptions
}

async function* currentStateRecipe<State>(options: QueryRecipeOptions<State>): AsyncIterable<string> {
  yield event.patchElements(options.render(await options.load()), options.patch)
  for await (const _ of options.invalidations) {
    yield event.patchElements(options.render(await options.load()), options.patch)
  }
}

async function* values(items: readonly unknown[]): AsyncIterable<unknown> {
  yield* items
}

async function* never(): AsyncIterable<unknown> {
  await new Promise<never>(() => {})
}

const countView = (count: number) => h("output", { id: "count" }, count)

describe("live query recipe", () => {
  it("renders current state on connect and after invalidation triggers", async () => {
    const states = [2, 5, 5]
    const patches: string[] = []
    for await (const patch of currentStateRecipe({
      invalidations: values(["missed-delta", "refresh"]),
      load: () => states.shift() ?? -1,
      render: countView,
      patch: { selector: "#count", mergeMode: "outer" }
    })) {
      patches.push(patch)
    }

    expect(patches).toEqual([
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">2</output>\n\n',
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">5</output>\n\n',
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">5</output>\n\n'
    ])
  })

  it("treats invalidation values as triggers instead of passing deltas to render", async () => {
    let count = 0
    const patches: string[] = []
    for await (const patch of currentStateRecipe({
      invalidations: values([10, 20]),
      load: () => ++count,
      render: countView
    })) {
      patches.push(patch)
    }

    expect(patches).toEqual([
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n',
      'event: datastar-patch-elements\ndata: elements <output id="count">2</output>\n\n',
      'event: datastar-patch-elements\ndata: elements <output id="count">3</output>\n\n'
    ])
  })

  it("composes recipe streams with reply.stream heartbeat comments", async () => {
    const response = stream(
      currentStateRecipe({
        invalidations: never(),
        load: () => 0,
        render: countView
      }),
      { heartbeat: { intervalMs: 1, initialDelayMs: 1, comment: "live" } }
    )
    const reader = response.body?.getReader()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(reader).toBeDefined()

    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(new TextDecoder().decode(first.value)).toContain('<output id="count">0</output>')

    const second = await reader!.read()
    expect(second.done).toBe(false)
    expect(new TextDecoder().decode(second.value)).toBe(": live\n\n")

    await reader!.cancel()
  })

  it("lets load failures fail the stream for explicit app handling", async () => {
    const response = stream(currentStateRecipe({
      invalidations: values([]),
      load: () => {
        throw new Error("boom")
      },
      render: countView
    }))
    const reader = response.body!.getReader()

    await expect(reader.read()).rejects.toThrow("boom")
  })
})
