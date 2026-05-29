import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { readSignals } from "../helpers.js"

interface BulkRow {
  readonly name: string
  readonly email: string
  status: "Active" | "Inactive"
}

const initialRows: readonly BulkRow[] = [
  { name: "Joe Smith", email: "joe@smith.org", status: "Inactive" },
  { name: "Angie MacDowell", email: "angie@macdowell.org", status: "Inactive" },
  { name: "Fuqua Tarkenton", email: "fuqua@tarkenton.org", status: "Active" },
  { name: "Kim Yee", email: "kim@yee.org", status: "Inactive" }
]

let rows: BulkRow[] = initialRows.map((row) => ({
  name: row.name,
  email: row.email,
  status: row.status
}))

const selectionDefaults = () => Array.from({ length: rows.length }, () => false)

const BulkTable = () => (
  <div
    id="bulk-update-demo"
    class="stack"
    {...ds.dataSignals(
      { _fetching: false, _all: false, selections: selectionDefaults() },
      {
        ifMissing: true
      }
    )}
  >
    <table>
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              aria-label="Select all rows"
              {...ds.bind("_all")}
              {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
              {...ds.on("change", ds.expr(`$selections = Array(${rows.length}).fill($_all)`))}
              {...ds.effect(ds.expr("$selections; $_all = $selections.every(Boolean)"))}
            />
          </th>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr>
            <td>
              <input
                type="checkbox"
                aria-label={`Select ${row.name}`}
                {...ds.bind("selections")}
                {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
              />
            </td>
            <td>{row.name}</td>
            <td>{row.email}</td>
            <td>
              <span class={`status ${row.status.toLowerCase()}`}>{row.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div role="group">
      <button
        class="success"
        {...ds.indicator("_fetching")}
        {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        {...ds.on("click", ds.put("/examples/bulk_update/activate"))}
      >
        Activate
      </button>
      <button
        class="error"
        {...ds.indicator("_fetching")}
        {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        {...ds.on("click", ds.put("/examples/bulk_update/deactivate"))}
      >
        Deactivate
      </button>
    </div>
  </div>
)

const updateSelectedRows = async (
  request: Request,
  status: BulkRow["status"]
): Promise<Response> => {
  const signals = await readSignals<{ selections?: readonly boolean[] }>(request)
  const selections = signals.selections ?? []
  rows = rows.map((row, index) =>
    selections[index] === true
      ? {
          name: row.name,
          email: row.email,
          status
        }
      : row
  )

  return reply.stream([
    event.signals({ _all: false, selections: selectionDefaults() }),
    event.patch(<BulkTable />)
  ])
}

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Bulk Update"
      slug="bulk_update"
      summary="Uses checkbox signals to update selected rows on the server."
      source="https://data-star.dev/examples/bulk_update"
    >
      <BulkTable />
    </ExampleLayout>,
    {
      title: "Bulk Update - Datastar Kit",
      head: pageHead()
    }
  )
)

example.put("/activate", (c) => updateSelectedRows(c.req.raw, "Active"))
example.put("/deactivate", (c) => updateSelectedRows(c.req.raw, "Inactive"))
