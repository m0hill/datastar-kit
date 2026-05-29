import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { readSignals } from "../helpers.js"

const people = [
  ["Elda", "Reynolds"],
  ["Trever", "Veum"],
  ["Xavier", "Nolan"],
  ["Celestino", "Schuppe"],
  ["Clementina", "Harvey"],
  ["Jacky", "Schultz"],
  ["Maximus", "Schultz"],
  ["Terrill", "Maggio"],
  ["Wilhelmine", "Kautzer"],
  ["Rosanna", "Nicolas"],
  ["Camila", "Schiller"],
  ["Jazmin", "Wilder"]
] as const

const state = ds.state({ search: "" })

const Results = ({ search = "" }: { readonly search?: string | undefined }) => {
  const term = search.trim().toLowerCase()
  const filtered = people.filter(([first, last]) => `${first} ${last}`.toLowerCase().includes(term))

  return (
    <tbody id="active-search-results">
      {filtered.length === 0 ? (
        <tr>
          <td colSpan={2} class="muted">
            No people match that search.
          </td>
        </tr>
      ) : (
        filtered.map(([first, last]) => (
          <tr>
            <td>{first}</td>
            <td>{last}</td>
          </tr>
        ))
      )}
    </tbody>
  )
}

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Active Search"
      slug="active_search"
      summary="Filters a server-rendered result set as the user types."
      source="https://data-star.dev/examples/active_search"
    >
      <div class="stack" {...state.attrs()}>
        <label>
          Search
          <input
            type="text"
            placeholder="Search..."
            {...ds.bind(state.$.search)}
            {...ds.on("input", ds.get("/examples/active_search/search"), {
              debounce: "200ms"
            })}
          />
        </label>
        <table>
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
            </tr>
          </thead>
          <Results />
        </table>
      </div>
    </ExampleLayout>,
    {
      title: "Active Search - Datastar Kit",
      head: pageHead()
    }
  )
)

example.get("/search", async (c) => {
  const signals = await readSignals<{ search?: string }>(c.req.raw)
  return reply.patch(<Results search={signals.search} />)
})
