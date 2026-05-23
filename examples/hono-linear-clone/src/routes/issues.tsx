import type { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { event, read, reply } from "datastar-kit"
import type { AppVariables } from "../auth/session.js"
import {
  createComment,
  createIssue,
  loadIssue,
  loadWorkspace,
  updateIssue
} from "../features/linear-service.js"
import {
  appSignals,
  commentSchema,
  errorsFrom,
  issueSchema,
  updateIssueSchema
} from "../features/validation.js"
import { invalidations } from "../realtime/hub.js"
import { IssuePanel, IssuePanelContent } from "../ui/issue.js"
import { appState } from "../ui/state.js"
import { Board } from "../ui/workspace.js"
import { appErrorPatch, firstErrors } from "./helpers.js"

type App = Hono<{ Variables: AppVariables }>

const issueIdParam = z.coerce.number().int().positive()

export const registerIssueRoutes = (app: App) => {
  app.post("/issues", async (c) => {
    const result = issueSchema.safeParse(await read.signals(c.req.raw))
    if (!result.success) {
      const errors = firstErrors(errorsFrom(result.error))
      return appErrorPatch({
        form: errors.field("projectId"),
        issueTitle: errors.field("issueTitle")
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
        if (c.req.raw.signal.aborted) return
        yield await render()
      }
    }

    return reply.stream(stream(), {
      heartbeat: { intervalMs: 15_000, comment: "issue-detail" }
    })
  })

  app.patch("/issues/:id", async (c) => {
    const issueId = issueIdParam.parse(c.req.param("id"))
    const result = updateIssueSchema.safeParse(await c.req.parseBody())
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
      const errors = firstErrors(errorsFrom(result.error))
      return appErrorPatch({ commentBody: errors.field("commentBody") })
    }

    await createComment(c.get("user"), issueId, result.data.commentBody)
    invalidations.publish()
    return reply.stream([
      event.signals(appState.patch({ commentBody: "", errors: appSignals.errors })),
      event.patch(<IssuePanelContent detail={await loadIssue(issueId)} />)
    ])
  })
}
