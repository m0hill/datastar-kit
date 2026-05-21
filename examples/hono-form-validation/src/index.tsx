import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { z } from "zod"
import { ds, event, read, reply } from "datastar-kit"

const nameError = ds.signal<string, "errors.name">("errors.name")
const emailError = ds.signal<string, "errors.email">("errors.email")
const app = new Hono()

app.get("/", () =>
  reply.page(
    <main {...ds.dataSignals({ name: "", email: "", errors: { name: "", email: "" } }, { ifMissing: true })}>
      <h1>Signup</h1>
      <form {...ds.on("submit", ds.post("/signup"), { prevent: true })}>
        <p>
          <label>
            Name
            <br />
            <input name="name" {...ds.bind("name")} />
          </label>
          <br />
          <small style="display: none; color: crimson" {...ds.show(nameError)} {...ds.text(nameError)}></small>
        </p>

        <p>
          <label>
            Email
            <br />
            <input name="email" {...ds.bind("email")} />
          </label>
          <br />
          <small style="display: none; color: crimson" {...ds.show(emailError)} {...ds.text(emailError)}></small>
        </p>

        <button type="submit">Create account</button>
      </form>
      <p id="result"></p>
    </main>,
    {
      title: "Datastar form validation",
      head: <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js" />
    }
  )
)

app.post("/signup", async (c) => {
  try {
    const input = await read.signals(
      c.req.raw,
      z.object({
        name: z.string().trim().min(2, "Enter your name"),
        email: z.string().trim().email("Enter a valid email")
      })
    )

    return reply.stream([
      event.signals({ name: "", email: "", errors: { name: "", email: "" } }),
      event.patch(<p id="result">Thanks {input.name}, check {input.email}.</p>)
    ])
  } catch (error) {
    if (!(error instanceof read.SignalValidationError)) {
      throw error
    }

    const errors = { name: "", email: "" }
    for (const issue of error.issues) {
      const key = issue.path?.[0]
      if (key === "name" || key === "email") {
        errors[key] = issue.message
      }
    }

    return reply.stream([
      event.signals({ errors }),
      event.patch(<p id="result">Please fix the form.</p>)
    ])
  }
})

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log("Hono form validation listening on http://localhost:3000")
})
