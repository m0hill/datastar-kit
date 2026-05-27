import { ds, event, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { readSignals, sleep } from "../helpers.js"
import type { ExampleModule } from "../types.js"

const throbStates = [
  { fg: "#174ea6", bg: "#fff4cc", label: "blue on yellow" },
  { fg: "#8a2c0d", bg: "#ffe0b5", label: "brown on orange" },
  { fg: "#0f6b4f", bg: "#dff8ef", label: "green on mint" },
  { fg: "#6b2bbd", bg: "#f0e8ff", label: "purple on lavender" }
] as const

const Throb = ({ index }: { readonly index: number }) => {
  const item = throbStates[index % throbStates.length] ?? throbStates[0]
  return (
    <div
      id="throb"
      class="animation-tile"
      style={`color: ${item.fg}; background-color: ${item.bg};`}
    >
      {item.label}
    </div>
  )
}

const ViewTransitionButton = ({ restored }: { readonly restored: boolean }) => (
  <button
    id="view-transition"
    class={restored ? "success" : "info"}
    {...ds.dataSignals({ shouldRestore: restored })}
    {...ds.indicator("_vtFetching")}
    {...ds.dataAttr("disabled", ds.expr("$_vtFetching"))}
    {...ds.on("click", ds.get("/examples/animations/view_transition"))}
  >
    {restored ? "Restored. Swap again." : "Swap It!"}
  </button>
)

const FadeOutButton = ({ fading = false }: { readonly fading?: boolean }) => (
  <button
    id="fade-out-swap"
    class="warning"
    style={`transition: opacity 1s ease-out; opacity: ${fading ? "0" : "1"};`}
    {...ds.indicator("_fadeOutFetching")}
    {...ds.dataAttr("disabled", ds.expr("$_fadeOutFetching"))}
    {...ds.on("click", ds.delete("/examples/animations/fade_out"))}
  >
    Fade out then delete on click
  </button>
)

const FadeInButton = ({ visible = true }: { readonly visible?: boolean }) => (
  <button
    id="fade-me-in"
    class="success"
    style={`transition: opacity 1s ease-out; opacity: ${visible ? "1" : "0"};`}
    {...ds.indicator("_fadeInFetching")}
    {...ds.dataAttr("disabled", ds.expr("$_fadeInFetching"))}
    {...ds.on("click", ds.get("/examples/animations/fade_me_in"))}
  >
    {visible ? "Fade me in on click" : "Preparing fade in..."}
  </button>
)

export const animationsExample: ExampleModule = {
  slug: "animations",
  title: "Animations",
  summary: "Uses stable element ids, SSE patches, and view transitions for CSS-driven animation.",
  source: "https://data-star.dev/examples/animations",
  register(app) {
    app.get("/examples/animations", () =>
      examplePage({
        title: "Animations",
        slug: "animations",
        summary: this.summary,
        source: this.source,
        children: (
          <div class="stack">
            <section class="subdemo">
              <h2>Color Throb</h2>
              <div {...ds.init(ds.get("/examples/animations/throb"))}>
                <Throb index={1} />
              </div>
            </section>
            <section class="subdemo">
              <h2>View Transitions</h2>
              <ViewTransitionButton restored={false} />
            </section>
            <section class="subdemo">
              <h2>Fade Out On Swap</h2>
              <FadeOutButton />
            </section>
            <section class="subdemo">
              <h2>Fade In On Addition</h2>
              <FadeInButton />
            </section>
          </div>
        )
      })
    )

    app.get("/examples/animations/throb", (c) => {
      async function* stream() {
        let index = 0
        while (!c.req.raw.signal.aborted) {
          yield event.patch(<Throb index={index} />)
          index += 1
          await sleep(1000)
        }
      }

      return reply.stream(stream(), { heartbeat: { intervalMs: 15_000, comment: "animations" } })
    })

    app.get("/examples/animations/view_transition", async (c) => {
      const { shouldRestore = false } = await readSignals<{ shouldRestore?: boolean }>(c.req.raw)
      return reply.patch(<ViewTransitionButton restored={!shouldRestore} />, {
        useViewTransition: true
      })
    })

    app.delete("/examples/animations/fade_out", () =>
      reply.stream(
        (async function* () {
          yield event.patch(<FadeOutButton fading />)
          await sleep(1000)
          yield event.patch("", { selector: "#fade-out-swap", mode: "remove" })
        })()
      )
    )

    app.get("/examples/animations/fade_me_in", () =>
      reply.stream(
        (async function* () {
          yield event.patch(<FadeInButton visible={false} />)
          await sleep(40)
          yield event.patch(<FadeInButton visible />)
        })()
      )
    )
  }
}
