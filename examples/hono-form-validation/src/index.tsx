import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { z } from "zod"
import { ds, event, read, reply } from "datastar-kit"

const DATASTAR_RUNTIME = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const nameError = ds.signal<string, "errors.name">("errors.name")
const emailError = ds.signal<string, "errors.email">("errors.email")
const SignupSignals = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email")
})
type SignupSignalsInput = z.input<typeof SignupSignals>
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
      head: <script type="module" src={DATASTAR_RUNTIME} />
    }
  )
)

app.post("/signup", async (c) => {
  try {
    const input = SignupSignals.parse(await read.signals(c.req.raw))

    return reply.stream([
      event.signals({ name: "", email: "", errors: { name: "", email: "" } }),
      event.patch(<p id="result">Thanks {input.name}, check {input.email}.</p>)
    ])
  } catch (error) {
    if (!(error instanceof z.ZodError)) {
      throw error
    }

    const { fieldErrors } = z.flattenError(error as z.ZodError<SignupSignalsInput>)
    const errors = {
      name: fieldErrors.name?.[0] ?? "",
      email: fieldErrors.email?.[0] ?? ""
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
