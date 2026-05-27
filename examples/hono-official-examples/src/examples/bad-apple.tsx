import { ds, event, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { sleep } from "../helpers.js"
import type { ExampleModule } from "../types.js"

const frames = [
  String.raw`
        ####
      ########
     ###    ###
     ##      ##
     ###    ###
      ########
        ####
`,
  String.raw`
          ####
       ##########
     ####      ####
    ###          ###
     ####      ####
       ##########
          ####
`,
  String.raw`
    ####
   #######
  ###   #######
  ##       #######
  ###   #######
   #######
    ####
`,
  String.raw`
        ##
       ####
      ######
     ########
    ##########
       ####
       ####
`,
  String.raw`
  \        /
   \      /
    \####/
    ######
    /####\
   /      \
  /        \
`
] as const

const firstFrame = frames[0]

const BadApplePanel = () => (
  <div
    class="bad-apple"
    {...ds.dataSignals({ _percentage: 0, _contents: "Waiting for frames..." })}
    {...ds.init(ds.get("/examples/bad_apple/updates"))}
  >
    <label>
      <span {...ds.text(ds.expr("`Percentage: ${$_percentage.toFixed(2)}%`"))}></span>
      <input
        type="range"
        min="0"
        max="100"
        step="0.01"
        disabled
        {...ds.dataAttr("value", ds.expr("$_percentage"))}
      />
    </label>
    <pre aria-live="polite" {...ds.text(ds.expr("$_contents"))}></pre>
  </div>
)

export const badAppleExample: ExampleModule = {
  slug: "bad_apple",
  title: "Bad Apple",
  summary: "Streams signal patches that update a progress control and ASCII frame output.",
  source: "https://data-star.dev/examples/bad_apple",
  register(app) {
    app.get("/examples/bad_apple", () =>
      examplePage({
        title: "Bad Apple",
        slug: "bad_apple",
        summary: this.summary,
        source: this.source,
        children: <BadApplePanel />
      })
    )

    app.get("/examples/bad_apple/updates", (c) => {
      async function* stream() {
        const total = 60
        for (let index = 0; index <= total && !c.req.raw.signal.aborted; index += 1) {
          yield event.signals({
            _percentage: (index / total) * 100,
            _contents: frames[index % frames.length] ?? firstFrame
          })
          await sleep(90)
        }
      }

      return reply.stream(stream(), { heartbeat: { intervalMs: 15_000, comment: "bad-apple" } })
    })
  }
}
