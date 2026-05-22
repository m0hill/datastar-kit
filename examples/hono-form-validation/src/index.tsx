import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { z } from "zod"
import { ds, event, read, reply } from "datastar-kit"

const DATASTAR_RUNTIME = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const signup = ds.state(
  {
    name: "",
    email: "",
    errors:
    {
      name: "",
      email: ""
    }
  })

const SignupSignals = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email")
})
const app = new Hono()

app.get("/", () =>
  reply.page(
    <main {...signup.attrs()}>
      <h1>Signup</h1>
      <form {...ds.on("submit", ds.post("/signup"), { prevent: true })}>
        <p>
          <label>
            Name
            <br />
            <input name="name" {...ds.bind(signup.$.name)} />
          </label>
          <br />
          <small style="display: none; color: crimson" {...ds.show(signup.$.errors.name)} {...ds.text(signup.$.errors.name)}></small>
        </p>

        <p>
          <label>
            Email
            <br />
            <input name="email" {...ds.bind(signup.$.email)} />
          </label>
          <br />
          <small style="display: none; color: crimson" {...ds.show(signup.$.errors.email)} {...ds.text(signup.$.errors.email)}></small>
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
  const result = SignupSignals.safeParse(await read.signals(c.req.raw))

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    const errors = {
      name: fieldErrors.name?.[0] ?? "",
      email: fieldErrors.email?.[0] ?? ""
    }

    return reply.stream([
      event.signals(signup.patch({ errors })),
      event.patch(<p id="result">Please fix the form.</p>)
    ])
  }

  const input = result.data
  return reply.stream([
    event.signals(signup.reset()),
    event.patch(<p id="result">Thanks {input.name}, check {input.email}.</p>)
  ])
})

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log("Hono form validation listening on http://localhost:3000")
})
