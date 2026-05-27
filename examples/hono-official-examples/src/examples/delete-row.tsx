import { ds, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import type { ExampleModule } from "../types.js"

const initialRows = [
  { name: "Joe Smith", email: "joe@smith.org" },
  { name: "Angie MacDowell", email: "angie@macdowell.org" },
  { name: "Kim Yee", email: "kim@yee.org" }
]

let rows = initialRows.map((row) => ({ ...row }))

const DeleteRowTable = () => (
  <div id="delete-row-demo" class="stack">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={3} class="muted">
              No rows remain.
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>
                <button
                  class="error"
                  {...ds.indicator("_fetching")}
                  {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
                  {...ds.on(
                    "click",
                    ds.expr(
                      `confirm('Are you sure?') && @delete('/examples/delete_row/${index}')`
                    )
                  )}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    <button class="warning" {...ds.on("click", ds.patch("/examples/delete_row/reset"))}>
      Reset
    </button>
  </div>
)

export const deleteRowExample: ExampleModule = {
  slug: "delete_row",
  title: "Delete Row",
  summary: "Confirms a delete action and patches the remaining table rows from the server.",
  source: "https://data-star.dev/examples/delete_row",
  register(app) {
    app.get("/examples/delete_row", () =>
      examplePage({
        title: "Delete Row",
        slug: "delete_row",
        summary: this.summary,
        source: this.source,
        children: <DeleteRowTable />
      })
    )

    app.delete("/examples/delete_row/:index", (c) => {
      const index = Number(c.req.param("index"))
      rows = rows.filter((_, rowIndex) => rowIndex !== index)
      return reply.patch(<DeleteRowTable />)
    })

    app.patch("/examples/delete_row/reset", () => {
      rows = initialRows.map((row) => ({ ...row }))
      return reply.patch(<DeleteRowTable />)
    })
  }
}
