import { ds, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { readSignals } from "../helpers.js"
import type { ExampleModule } from "../types.js"

interface EditableRow extends Record<string, string> {
  name: string
  email: string
}

const initialRows: readonly EditableRow[] = [
  { name: "Joe Smith", email: "joe@smith.org" },
  { name: "Angie MacDowell", email: "angie@macdowell.org" },
  { name: "Fuqua Tarkenton", email: "fuqua@tarkenton.org" },
  { name: "Kim Yee", email: "kim@yee.org" }
]

let rows = initialRows.map((row) => ({ ...row }))

const DisplayRow = ({ row, index }: { readonly row: EditableRow; readonly index: number }) => (
  <tr id={`edit-row-${index}`}>
    <td>{row.name}</td>
    <td>{row.email}</td>
    <td>
      <button class="info" {...ds.on("click", ds.get(`/examples/edit_row/${index}`))}>
        Edit
      </button>
    </td>
  </tr>
)

const EditingRow = ({ row, index }: { readonly row: EditableRow; readonly index: number }) => (
  <tr id={`edit-row-${index}`} {...ds.dataSignals(row)}>
    <td>
      <input type="text" {...ds.bind("name")} />
    </td>
    <td>
      <input type="email" {...ds.bind("email")} />
    </td>
    <td>
      <div role="group">
        <button {...ds.on("click", ds.get(`/examples/edit_row/${index}/cancel`))}>Cancel</button>
        <button class="success" {...ds.on("click", ds.patch(`/examples/edit_row/${index}`))}>
          Save
        </button>
      </div>
    </td>
  </tr>
)

const EditRowTable = () => (
  <div id="edit-row-demo" class="stack">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <DisplayRow row={row} index={index} />
        ))}
      </tbody>
    </table>
    <button class="warning" {...ds.on("click", ds.patch("/examples/edit_row/reset"))}>
      Reset
    </button>
  </div>
)

export const editRowExample: ExampleModule = {
  slug: "edit_row",
  title: "Edit Row",
  summary: "Replaces a single table row with an inline edit row and patches the saved result.",
  source: "https://data-star.dev/examples/edit_row",
  register(app) {
    app.get("/examples/edit_row", () =>
      examplePage({
        title: "Edit Row",
        slug: "edit_row",
        summary: this.summary,
        source: this.source,
        children: <EditRowTable />
      })
    )

    app.get("/examples/edit_row/:index", (c) => {
      const index = Number(c.req.param("index"))
      const row = rows[index]
      return row === undefined
        ? reply.done()
        : reply.patch(<EditingRow row={row} index={index} />)
    })

    app.get("/examples/edit_row/:index/cancel", (c) => {
      const index = Number(c.req.param("index"))
      const row = rows[index]
      return row === undefined ? reply.done() : reply.patch(<DisplayRow row={row} index={index} />)
    })

    app.patch("/examples/edit_row/reset", () => {
      rows = initialRows.map((row) => ({ ...row }))
      return reply.patch(<EditRowTable />)
    })

    app.patch("/examples/edit_row/:index", async (c) => {
      const index = Number(c.req.param("index"))
      const row = rows[index]
      if (row === undefined) return reply.done()
      const signals = await readSignals<Partial<EditableRow>>(c.req.raw)
      rows[index] = {
        name:
          typeof signals.name === "string" && signals.name.trim() ? signals.name.trim() : row.name,
        email:
          typeof signals.email === "string" && signals.email.trim() ? signals.email.trim() : row.email
      }
      const updated = rows[index] ?? row
      return reply.patch(<DisplayRow row={updated} index={index} />)
    })
  }
}
