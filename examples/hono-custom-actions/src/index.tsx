import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { fileURLToPath } from "node:url"
import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"

const app = new Hono()
const modalOpen = ds.signal<boolean, "modalOpen">("modalOpen")

app.use("/static/*", serveStatic({ root: fileURLToPath(new URL("../", import.meta.url)) }))

app.get("/", () =>
  reply.page(
    <main id="app" {...ds.dataSignals({ modalOpen: false }, { ifMissing: true })}>
      <h1>Custom Datastar actions</h1>
      <p>
        This example shows custom browser actions from <code>static/datastar-actions.js</code>. The
        server-rendered TSX can call those actions with <code>ds.action(...)</code>.
      </p>

      <section class="card">
        <h2>Server-rendered controls</h2>
        <p>
          The button below opens a native dialog through a custom action, which is useful when
          <code>showModal()</code>, backdrop checks, or focus code would make an inline expression
          noisy.
        </p>
        <div class="row">
          <button
            type="button"
            class="primary"
            {...ds.on("click", ds.action("setSignal", modalOpen.name, true))}
          >
            Open custom-action dialog
          </button>
        </div>
        <output id="result" class="result">
          No server confirmation yet.
        </output>
      </section>

      <section class="card">
        <h2>Registered browser plugins</h2>
        <ul class="plugin-list">
          <li>
            <code>@setSignal(path, value)</code> patches a Datastar signal from client code.
          </li>
          <li>
            <code>@syncDialog(open)</code> calls <code>showModal()</code> / <code>close()</code>.
          </li>
          <li>
            <code>@closeDialogOnBackdrop(path)</code> handles backdrop clicks with the event object.
          </li>
          <li>
            <code>data-focus-when</code> focuses an element when a reactive expression becomes true.
          </li>
        </ul>
      </section>

      <dialog
        id="confirm-dialog"
        aria-labelledby="confirm-dialog-title"
        {...ds.effect(ds.action("syncDialog", modalOpen))}
        {...ds.on("click", ds.action("closeDialogOnBackdrop", modalOpen.name))}
        {...ds.on("close", ds.action("setSignal", modalOpen.name, false))}
      >
        <section class="dialog-body">
          <h2 id="confirm-dialog-title">Run a server action?</h2>
          <p>
            Dialog synchronization, backdrop handling, and focus behavior live in a normal browser
            module while the markup still uses Datastar attributes.
          </p>
          <div class="dialog-actions">
            <button
              type="button"
              class="secondary"
              data-focus-when={modalOpen.toDatastarExpression()}
              {...ds.on("click", ds.action("setSignal", modalOpen.name, false))}
            >
              Cancel
            </button>
            <button type="button" class="danger" {...ds.on("click", ds.post("/confirm"))}>
              Confirm on server
            </button>
          </div>
        </section>
      </dialog>
    </main>,
    {
      title: "Datastar custom actions",
      head: [
        <link rel="stylesheet" href="/static/styles.css" />,
        <script type="module" src="/static/datastar-actions.js" />
      ]
    }
  )
)

app.post("/confirm", () =>
  reply.stream([
    event.signals({ modalOpen: false }),
    event.patch(
      <output id="result" class="result">
        Confirmed at {new Date().toLocaleTimeString()}.
      </output>
    )
  ])
)

app.notFound((c) => c.text("Not Found", 404))

const port = Number(process.env.PORT ?? "3000")
serve({ fetch: app.fetch, port }, () => {
  console.log(`Hono custom actions listening on http://localhost:${port}`)
})
