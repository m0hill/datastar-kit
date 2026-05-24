import type { Hono } from "hono"
import { event, read, reply } from "datastar-kit"
import type { AppVariables } from "../auth/session.js"
import { createProject, loadWorkspace } from "../features/linear-service.js"
import { appSignals, errorsFrom, projectSchema } from "../features/validation.js"
import { invalidations } from "../realtime/hub.js"
import { pageHead } from "../ui/layout.js"
import { IssueProjectSelect } from "../ui/modal.js"
import { appState } from "../ui/state.js"
import { AppShell } from "../ui/shell.js"
import { Board, Sidebar } from "../ui/workspace.js"
import { appErrorPatch, firstErrors, isUniqueConstraintError } from "./helpers.js"

type App = Hono<{ Variables: AppVariables }>

export const registerWorkspaceRoutes = (app: App) => {
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
        event.patch(<Board workspace={workspace} />),
        event.patch(<IssueProjectSelect workspace={workspace} />)
      ]
    }

    async function* stream() {
      yield* await render()

      for await (const _ of invalidations.subscribe()) {
        if (c.req.raw.signal.aborted) return
        yield* await render()
      }
    }

    return reply.stream(stream(), {
      heartbeat: { intervalMs: 15_000, comment: "linear-clone" }
    })
  })

  app.get("/modal/issue", async (c) => {
    const workspace = await loadWorkspace()
    return reply.stream([
      event.patch(<IssueProjectSelect workspace={workspace} />),
      event.signals({ modalOpen: true })
    ])
  })

  app.post("/projects", async (c) => {
    const result = projectSchema.safeParse(await read.signals(c.req.raw))
    if (!result.success) {
      const errors = firstErrors(errorsFrom(result.error))
      return appErrorPatch({
        projectName: errors.field("projectName"),
        projectKey: errors.field("projectKey")
      })
    }

    try {
      await createProject(c.get("user"), result.data)
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
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
      event.patch(<Board workspace={workspace} />),
      event.patch(<IssueProjectSelect workspace={workspace} />)
    ])
  })
}
