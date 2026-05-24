import { ds, read, reply } from "datastar-kit"
import { z } from "zod"
import type { App } from "../app-types.js"
import { createSession, getCurrentUser, sessionCookie } from "../auth/session.js"
import { authenticate } from "../db/users.js"
import { FieldError, pageHead } from "../shared/ui.js"

const loginSchema = z.object({
  username: z.string().trim().min(3, "Use at least 3 characters"),
  password: z.string().min(1, "Enter your password")
})

const loginState = ds.state({
  username: "",
  password: "",
  _validation: {
    form: "",
    username: "",
    password: ""
  }
})

const LoginPage = () => (
  <main class="min-h-screen grid place-items-center p-6 bg-bg" {...loginState.attrs()}>
    <section class="w-full max-w-90 bg-surface border border-border p-8 flex flex-col gap-5">
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
        <button type="submit" class="primary mt-1">
          Sign in
        </button>
      </form>
      <a
        href="/signup"
        class="text-fg-secondary text-[13px] font-medium hover:text-fg hover:underline transition-colors"
      >
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
    const result = loginSchema.safeParse(await read.signals(c.req.raw))
    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error)

      return reply.signals(
        loginState.patch({
          _validation: {
            ...loginState.defaults._validation,
            username: fieldErrors.username?.[0] ?? "",
            password: fieldErrors.password?.[0] ?? ""
          }
        })
      )
    }

    const user = await authenticate(result.data)
    if (user === null) {
      return reply.signals(
        loginState.patch({
          _validation: {
            ...loginState.defaults._validation,
            form: "Username or password is incorrect"
          }
        })
      )
    }

    return reply.navigate(
      "/app",
      {},
      { headers: { "set-cookie": sessionCookie(await createSession(user.id)) } }
    )
  })
}
