import { ds, read, reply } from "datastar-kit"
import { z } from "zod"
import type { App } from "../app-types.js"
import { createSession, getCurrentUser, sessionCookie } from "../auth/session.js"
import { createUser } from "../auth/users.js"
import { FieldError, isUniqueConstraintError, pageHead } from "../shared/ui.js"

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  username: z.string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(24, "Keep it under 24 characters")
    .regex(/^[a-z0-9_-]+$/i, "Use letters, numbers, underscores, or dashes"),
  password: z.string().min(8, "Use at least 8 characters")
})

const signupState = ds.state({
  name: "",
  username: "",
  password: "",
  _validation: {
    form: "",
    name: "",
    username: "",
    password: ""
  }
})

const SignupPage = () => (
  <main class="min-h-screen grid place-items-center p-6 bg-bg" {...signupState.attrs()}>
    <section class="w-full max-w-90 bg-surface border border-border p-8 flex flex-col gap-5">
      <div>
        <h1 class="text-xl font-bold text-fg tracking-tight">Create account</h1>
        <p class="text-fg-muted text-[13px] mt-1">Get started with your new workspace</p>
      </div>
      <form class="flex flex-col gap-4" {...ds.on("submit", ds.post("/signup"), { prevent: true })}>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Name
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            autocomplete="name"
            placeholder="Your name"
            {...ds.bind(signupState.$.name)}
          />
          <FieldError path={signupState.$._validation.name} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Username
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            autocomplete="username"
            placeholder="Choose a username"
            {...ds.bind(signupState.$.username)}
          />
          <FieldError path={signupState.$._validation.username} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Password
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            type="password"
            autocomplete="new-password"
            placeholder="Create a password"
            {...ds.bind(signupState.$.password)}
          />
          <FieldError path={signupState.$._validation.password} />
        </label>
        <FieldError path={signupState.$._validation.form} />
        <button type="submit" class="primary mt-1">
          Create account
        </button>
      </form>
      <a
        href="/login"
        class="text-fg-secondary text-[13px] font-medium hover:text-fg hover:underline transition-colors"
      >
        Sign in instead
      </a>
    </section>
  </main>
)

export const registerSignupPage = (app: App) => {
  app.get("/signup", async (c) => {
    if ((await getCurrentUser(c)) !== null) {
      return c.redirect("/app")
    }

    return reply.page(<SignupPage />, { title: "Create account · Linear clone", head: pageHead })
  })

  app.post("/signup", async (c) => {
    const result = signupSchema.safeParse(await read.signals(c.req.raw))
    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error)

      return reply.signals(
        signupState.patch({
          _validation: {
            ...signupState.defaults._validation,
            name: fieldErrors.name?.[0] ?? "",
            username: fieldErrors.username?.[0] ?? "",
            password: fieldErrors.password?.[0] ?? ""
          }
        })
      )
    }

    try {
      const user = await createUser(result.data)
      return reply.navigate(
        "/app",
        {},
        { headers: { "set-cookie": sessionCookie(await createSession(user.id)) } }
      )
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
      return reply.signals(
        signupState.patch({
          _validation: {
            ...signupState.defaults._validation,
            username: "That username is already taken"
          }
        })
      )
    }
  })
}
