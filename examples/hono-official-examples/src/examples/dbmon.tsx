import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { randomInt, readSignals, sleep } from "../helpers.js"

interface Query {
  elapsed: number
  text: string
}

interface Database {
  name: string
  queries: Query[]
}

const queries = [
  "SELECT * FROM users WHERE id = ?",
  "UPDATE logs SET viewed = true",
  "SELECT count(*) FROM events",
  "INSERT INTO audit_log VALUES (?)",
  "SELECT * FROM invoices LIMIT 20"
]

let config = { mutationRate: 20, fps: 4 }
let databases: Database[] = Array.from({ length: 10 }, (_, index) => ({
  name: index % 2 === 0 ? `cluster${index / 2 + 1}` : `cluster${(index + 1) / 2}slave`,
  queries: Array.from({ length: 5 }, () => ({ elapsed: randomInt(0, 8), text: queries[0] ?? "" }))
}))

const mutate = () => {
  databases = databases.map((database) => ({
    ...database,
    queries: database.queries.map((query) => {
      if (Math.random() * 100 > config.mutationRate) return query
      return {
        elapsed: randomInt(0, 15),
        text: queries[randomInt(0, queries.length - 1)] ?? query.text
      }
    })
  }))
}

const queryClass = (elapsed: number): string =>
  elapsed > 10 ? "danger-cell" : elapsed > 5 ? "warn-cell" : "ok-cell"

const DbmonFrame = ({ renderTime }: { readonly renderTime: number }) => (
  <div id="dbmon-frame" class="stack">
    <p class="muted">Average render time for entire page: {renderTime.toFixed(2)}ms</p>
    <table class="dbmon-table">
      <tbody>
        {databases.map((database) => (
          <tr>
            <td>{database.name}</td>
            <td class="query-count">
              {database.queries.filter((query) => query.elapsed > 0).length}
            </td>
            {database.queries.map((query) => (
              <td class={queryClass(query.elapsed)} title={query.text}>
                {query.elapsed === 0 ? "0s" : `${query.elapsed}ms`}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const DbmonDemo = () => (
  <div
    id="dbmon-demo"
    class="stack"
    {...ds.dataSignals({ mutationRate: config.mutationRate, fps: config.fps }, { ifMissing: true })}
    {...ds.init(ds.get("/examples/dbmon/updates"))}
  >
    <div role="group">
      <label>
        Mutation Rate %
        <input
          type="number"
          min="0"
          max="100"
          {...ds.bind("mutationRate")}
          {...ds.on("change", ds.put("/examples/dbmon/inputs"))}
        />
      </label>
      <label>
        FPS
        <input
          type="number"
          min="1"
          max="12"
          {...ds.bind("fps")}
          {...ds.on("change", ds.put("/examples/dbmon/inputs"))}
        />
      </label>
    </div>
    <DbmonFrame renderTime={0} />
  </div>
)

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="DBmon"
      slug="dbmon"
      summary="Streams a changing database monitor table while form inputs tune the update rate."
      source="https://data-star.dev/examples/dbmon"
    >
      <DbmonDemo />
    </ExampleLayout>,
    {
      title: "DBmon - Datastar Kit",
      head: pageHead()
    }
  )
)

example.put("/inputs", async (c) => {
  const signals = await readSignals<{ mutationRate?: number; fps?: number }>(c.req.raw)
  config = {
    mutationRate: Math.max(0, Math.min(100, Number(signals.mutationRate ?? config.mutationRate))),
    fps: Math.max(1, Math.min(12, Number(signals.fps ?? config.fps)))
  }
  return reply.done()
})

example.get("/updates", (c) => {
  async function* stream() {
    while (!c.req.raw.signal.aborted) {
      const start = performance.now()
      mutate()
      yield event.patch(<DbmonFrame renderTime={performance.now() - start} />)
      await sleep(1000 / config.fps)
    }
  }

  return reply.stream(stream(), { heartbeat: { intervalMs: 15_000, comment: "dbmon" } })
})
