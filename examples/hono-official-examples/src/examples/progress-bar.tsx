import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { sleep } from "../helpers.js"

const circumference = 565.48

const ProgressBar = ({ progress }: { readonly progress: number }) => {
  const offset = circumference - (progress / 100) * circumference
  const done = progress >= 100

  return (
    <div
      id="progress-bar-demo"
      class="progress-demo"
      {...(done ? {} : ds.init(ds.get("/examples/progress_bar/updates", { openWhenHidden: true })))}
    >
      <svg width="220" height="220" viewBox="-25 -25 250 250" class="progress-ring">
        <circle
          r="90"
          cx="100"
          cy="100"
          fill="transparent"
          stroke="#e0e0e0"
          stroke-width="16"
          stroke-dasharray={`${circumference}px`}
          stroke-dashoffset="0"
        ></circle>
        <circle
          r="90"
          cx="100"
          cy="100"
          fill="transparent"
          stroke="#16a06f"
          stroke-width="16"
          stroke-linecap="round"
          stroke-dashoffset={`${offset}px`}
          stroke-dasharray={`${circumference}px`}
        ></circle>
        <text x="100" y="116" text-anchor="middle" fill="#16835b" font-size="44" font-weight="800">
          {Math.round(progress)}%
        </text>
      </svg>
      {done ? (
        <button class="success" {...ds.on("click", ds.get("/examples/progress_bar/updates"))}>
          Completed! Try again?
        </button>
      ) : null}
    </div>
  )
}

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Progress Bar"
      slug="progress_bar"
      summary="Streams progress updates that morph an SVG progress ring."
      source="https://data-star.dev/examples/progress_bar"
    >
      <ProgressBar progress={0} />
    </ExampleLayout>,
    {
      title: "Progress Bar - Datastar Kit",
      head: pageHead()
    }
  )
)

example.get("/updates", (c) => {
  async function* stream() {
    for (let progress = 0; progress <= 100 && !c.req.raw.signal.aborted; progress += 5) {
      yield event.patch(<ProgressBar progress={progress} />)
      await sleep(120)
    }
  }

  return reply.stream(stream(), { heartbeat: { intervalMs: 15_000, comment: "progress-bar" } })
})
