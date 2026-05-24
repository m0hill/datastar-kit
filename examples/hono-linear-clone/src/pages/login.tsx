import { ds, read, reply } from "datastar-kit"
import { z } from "zod"
import type { App } from "../app-types.js"
import {
  createSession,
  getCurrentUser,
  sessionCookie
} from "../auth/session.js"
import { authenticate } from "../auth/users.js"
import { FieldError, firstErrors, pageHead } from "../shared/ui.js"

const loginSignals = {
  username: "",
  password: "",
  _validation: {
    form: "",
    username: "",
    password: ""
  }
}

const loginState = ds.state(loginSignals)

const loginSchema = z.object({
  username: z.string().trim().min(3, "Use at least 3 characters"),
  password: z.string().min(1, "Enter your password")
})

const loginValidationPatch = (errors: Partial<typeof loginSignals._validation>) =>
  reply.signals(loginState.patch({ _validation: { ...loginSignals._validation, ...errors } }))

const navigateToAppWithSession = async (userId: number) =>
  reply.navigate(
    "/app",
    {},
    { headers: { "set-cookie": sessionCookie(await createSession(userId)) } }
  )

const LoginPage = () => (
  <main class="min-h-screen grid place-items-center p-6 bg-bg" {...loginState.attrs()}>
    <section class="w-full max-w-[360px] bg-surface border border-border p-8 flex flex-col gap-5">
      <div>
        <h1 class="text-xl font-bold text-fg tracking-tight">Sign in</h1>
        <p class="text-fg-muted text-[13px] mt-1">Welcome back to your workspace</p>
      </div>
      <form class="flex flex-col gap-4" {...ds.on("submit", ds.post("/login"), { prevent: true })}>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Username
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            autocomplete="username"
            placeholder="Enter username"
            {...ds.bind(loginState.$.username)}
          />
          <FieldError path={loginState.$._validation.username} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Password
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            type="password"
            autocomplete="current-password"
            placeholder="Enter password"
            {...ds.bind(loginState.$.password)}
          />
          <FieldError path={loginState.$._validation.password} />
        </label>
        <FieldError path={loginState.$._validation.form} />
        <button type="submit" class="primary mt-1">Sign in</button>
      </form>
      <a href="/signup" class="text-fg-secondary text-[13px] font-medium hover:text-fg hover:underline transition-colors">
        Create an account
      </a>
    </section>
  </main>
)

export const registerLoginPage = (app: App) => {
  app.get("/", async (c) =>
    (await getCurrentUser(c)) === null ? c.redirect("/login") : c.redirect("/app")
  )

  app.get("/login", async (c) => {
    if ((await getCurrentUser(c)) !== null) {
      return c.redirect("/app")
    }

    return reply.page(<LoginPage />, { title: "Sign in · Linear clone", head: pageHead })
  })

  app.post("/login", async (c) => {
    const parsedLogin = loginSchema.safeParse(await read.signals(c.req.raw))
    if (!parsedLogin.success) {
      const errors = firstErrors(parsedLogin.error)
      return loginValidationPatch({
        username: errors.field("username"),
        password: errors.field("password")
      })
    }

    const user = await authenticate(parsedLogin.data)
    if (user === null) {
      return loginValidationPatch({ form: "Username or password is incorrect" })
    }

    return navigateToAppWithSession(user.id)
  })
}
