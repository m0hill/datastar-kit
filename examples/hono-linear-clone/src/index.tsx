import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { getCookie } from "hono/cookie"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { event, read, reply } from "datastar-kit"
import {
  createSession,
  currentUser,
  deleteSession,
  expiredSessionCookie,
  requireUser,
  sessionCookie,
  type AppVariables
} from "./auth/session.js"
import {
  authenticate,
  createComment,
  createIssue,
  createProject,
  createUser,
  loadIssue,
  loadWorkspace,
  updateIssue
} from "./features/linear-service.js"
import {
  appSignals,
  authSignals,
  commentSchema,
  errorsFrom,
  issueSchema,
  loginSchema,
  projectSchema,
  signupSchema,
  updateIssueSchema
} from "./features/validation.js"
import { invalidations } from "./realtime/hub.js"
import { AppShell, Board, IssueComposer, IssuePanel, IssuePanelContent, Sidebar } from "./ui/app.js"
import { LoginPage, SignupPage } from "./ui/auth.js"
import { pageHead } from "./ui/layout.js"
import { appState, authState } from "./ui/state.js"

const port = Number(process.env.PORT ?? 3000)
const app = new Hono<{ Variables: AppVariables }>()

const authErrorPatch = (errors: Partial<typeof authSignals.errors>) =>
  reply.signals(authState.patch({ errors: { ...authSignals.errors, ...errors } }))

const appErrorPatch = (errors: Partial<typeof appSignals.errors>) =>
  reply.signals(appState.patch({ errors: { ...appSignals.errors, ...errors } }))

const issueIdParam = z.coerce.number().int().positive()

app.get("/", async (c) => {
  const user = await currentUser(c)
  if (user === null) {
    return c.redirect("/login")
  }

  return c.redirect("/app")
})

app.get("/login", async (c) => {
  if ((await currentUser(c)) !== null) {
    return c.redirect("/app")
  }

  return reply.page(<LoginPage />, { title: "Sign in · Linear clone", head: pageHead })
})

app.post("/login", async (c) => {
  const result = loginSchema.safeParse(await read.signals(c.req.raw))
  if (!result.success) {
    const errors = errorsFrom(result.error)
    return authErrorPatch({
      username: errors.username?.[0] ?? "",
      password: errors.password?.[0] ?? ""
    })
  }

  const user = await authenticate(result.data)
  if (user === null) {
    return authErrorPatch({ form: "Username or password is incorrect" })
  }

  return reply.navigate(
    "/app",
    {},
    { headers: { "set-cookie": sessionCookie(await createSession(user.id)) } }
  )
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
    const errors = errorsFrom(result.error)
    return authErrorPatch({
      name: errors.name?.[0] ?? "",
      username: errors.username?.[0] ?? "",
      password: errors.password?.[0] ?? ""
    })
  }

  try {
    const user = await createUser(result.data)
    return reply.navigate(
      "/app",
      {},
      { headers: { "set-cookie": sessionCookie(await createSession(user.id)) } }
    )
  } catch {
    return authErrorPatch({ username: "That username is already taken" })
  }
})

app.post("/logout", async (c) => {
  await deleteSession(getCookie(c, "linear_session"))
  const response = c.redirect("/login")
  response.headers.append("set-cookie", expiredSessionCookie())
  return response
})

app.use("/app/*", requireUser)
app.use("/app", requireUser)
app.use("/projects", requireUser)
app.use("/issues/*", requireUser)

app.get("/app", async (c) => {
  const workspace = await loadWorkspace()
  return reply.page(<AppShell user={c.get("user")} workspace={workspace} />, {
    title: "Linear clone",
    head: pageHead
  })
})

app.get("/app/live", async (c) => {
  const user = c.get("user")

  const render = async () => {
    const workspace = await loadWorkspace()
    return [
      event.patch(<Sidebar user={user} workspace={workspace} />),
      event.patch(<IssueComposer workspace={workspace} />),
      event.patch(<Board workspace={workspace} />)
    ]
  }

  async function* stream() {
    yield* await render()

    for await (const _ of invalidations.subscribe()) {
      if (c.req.raw.signal.aborted) {
        return
      }

      yield* await render()
    }
  }

  return reply.stream(stream(), {
    heartbeat: { intervalMs: 15_000, comment: "linear-clone" }
  })
})

app.post("/projects", async (c) => {
  const result = projectSchema.safeParse(await read.signals(c.req.raw))
  if (!result.success) {
    const errors = errorsFrom(result.error)
    return appErrorPatch({
      projectName: errors.projectName?.[0] ?? "",
      projectKey: errors.projectKey?.[0] ?? ""
    })
  }

  try {
    await createProject(c.get("user"), result.data)
  } catch {
    return appErrorPatch({ projectKey: "Project keys must be unique" })
  }

  invalidations.publish()
  const workspace = await loadWorkspace()
  return reply.stream([
    event.signals(
      appState.patch({
        projectName: "",
        projectKey: "",
        projectDescription: "",
        errors: appSignals.errors
      })
    ),
    event.patch(<Sidebar user={c.get("user")} workspace={workspace} />),
    event.patch(<IssueComposer workspace={workspace} />)
  ])
})

app.post("/issues", async (c) => {
  const result = issueSchema.safeParse(await read.signals(c.req.raw))
  if (!result.success) {
    const errors = errorsFrom(result.error)
    return appErrorPatch({
      form: errors.projectId?.[0] ?? "",
      issueTitle: errors.issueTitle?.[0] ?? ""
    })
  }

  const issue = await createIssue(c.get("user"), result.data)
  invalidations.publish()
  const workspace = await loadWorkspace()
  return reply.stream([
    event.signals(
      appState.patch({
        issueTitle: "",
        issueDescription: "",
        commentBody: "",
        errors: appSignals.errors
      })
    ),
    event.patch(<Board workspace={workspace} />),
    event.patch(<IssuePanel detail={await loadIssue(issue.id)} />)
  ])
})

app.get("/issues/:id", async (c) => {
  const issueId = issueIdParam.parse(c.req.param("id"))
  const detail = await loadIssue(issueId)
  if (detail === null) {
    throw new HTTPException(404)
  }

  return reply.patch(<IssuePanel detail={detail} />)
})

app.get("/issues/:id/live", async (c) => {
  const issueId = issueIdParam.parse(c.req.param("id"))

  const render = async () => event.patch(<IssuePanelContent detail={await loadIssue(issueId)} />)

  async function* stream() {
    yield await render()

    for await (const _ of invalidations.subscribe()) {
      if (c.req.raw.signal.aborted) {
        return
      }

      yield await render()
    }
  }

  return reply.stream(stream(), {
    heartbeat: { intervalMs: 15_000, comment: "issue-detail" }
  })
})

app.patch("/issues/:id", async (c) => {
  const issueId = issueIdParam.parse(c.req.param("id"))
  const form = await c.req.parseBody()
  const result = updateIssueSchema.safeParse(form)
  if (!result.success) {
    return reply.done()
  }

  await updateIssue(issueId, result.data)
  invalidations.publish()
  const [workspace, detail] = await Promise.all([loadWorkspace(), loadIssue(issueId)])
  return reply.stream([
    event.patch(<Board workspace={workspace} />),
    event.patch(<IssuePanelContent detail={detail} />)
  ])
})

app.post("/issues/:id/comments", async (c) => {
  const issueId = issueIdParam.parse(c.req.param("id"))
  const result = commentSchema.safeParse(await read.signals(c.req.raw))
  if (!result.success) {
    const errors = errorsFrom(result.error)
    return appErrorPatch({ commentBody: errors.commentBody?.[0] ?? "" })
  }

  await createComment(c.get("user"), issueId, result.data.commentBody)
  invalidations.publish()
  return reply.stream([
    event.signals(appState.patch({ commentBody: "", errors: appSignals.errors })),
    event.patch(<IssuePanelContent detail={await loadIssue(issueId)} />)
  ])
})

app.notFound((c) => c.text("Not Found", 404))

serve({ fetch: app.fetch, port }, () => {
  console.log(`Hono Linear clone listening on http://localhost:${port}`)
})
