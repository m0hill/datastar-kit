import { getCookie } from "hono/cookie"
import type { Hono } from "hono"
import { read, reply } from "datastar-kit"
import {
  createSession,
  currentUser,
  deleteSession,
  expiredSessionCookie,
  sessionCookie,
  type AppVariables
} from "../auth/session.js"
import { authenticate, createUser } from "../features/linear-service.js"
import { errorsFrom, loginSchema, signupSchema } from "../features/validation.js"
import { LoginPage, SignupPage } from "../ui/auth.js"
import { pageHead } from "../ui/layout.js"
import { authErrorPatch, firstErrors, isUniqueConstraintError } from "./helpers.js"

type App = Hono<{ Variables: AppVariables }>

const authNavigation = async (userId: number) =>
  reply.navigate(
    "/app",
    {},
    { headers: { "set-cookie": sessionCookie(await createSession(userId)) } }
  )

export const registerAuthRoutes = (app: App) => {
  app.get("/", async (c) =>
    (await currentUser(c)) === null ? c.redirect("/login") : c.redirect("/app")
  )

  app.get("/login", async (c) => {
    if ((await currentUser(c)) !== null) {
      return c.redirect("/app")
    }

    return reply.page(<LoginPage />, { title: "Sign in · Linear clone", head: pageHead })
  })

  app.post("/login", async (c) => {
    const result = loginSchema.safeParse(await read.signals(c.req.raw))
    if (!result.success) {
      const errors = firstErrors(errorsFrom(result.error))
      return authErrorPatch({
        username: errors.field("username"),
        password: errors.field("password")
      })
    }

    const user = await authenticate(result.data)
    if (user === null) {
      return authErrorPatch({ form: "Username or password is incorrect" })
    }

    return authNavigation(user.id)
  })

  app.get("/signup", async (c) => {
    if ((await currentUser(c)) !== null) {
      return c.redirect("/app")
    }

    return reply.page(<SignupPage />, { title: "Create account · Linear clone", head: pageHead })
  })

  app.post("/signup", async (c) => {
    const result = signupSchema.safeParse(await read.signals(c.req.raw))
    if (!result.success) {
      const errors = firstErrors(errorsFrom(result.error))
      return authErrorPatch({
        name: errors.field("name"),
        username: errors.field("username"),
        password: errors.field("password")
      })
    }

    try {
      const user = await createUser(result.data)
      return authNavigation(user.id)
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
      return authErrorPatch({ username: "That username is already taken" })
    }
  })

  app.post("/logout", async (c) => {
    await deleteSession(getCookie(c, "linear_session"))
    const response = c.redirect("/login")
    response.headers.append("set-cookie", expiredSessionCookie())
    return response
  })
}
