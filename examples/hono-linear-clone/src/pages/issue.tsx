import { HTTPException } from "hono/http-exception"
import { ds, event, read, reply } from "datastar-kit"
import { z } from "zod"
import type { App } from "../app-types.js"
import { createComment, loadIssue, type IssueDetail, updateIssue } from "../db/issue.js"
import { invalidations } from "../realtime/hub.js"
import {
  issuePriorities,
  issuePriorityValues,
  issueStatuses,
  issueStatusValues
} from "../shared/issue-options.js"
import { pageHead } from "../shared/ui.js"

const issueIdParam = z.coerce.number().int().positive()

const updateIssueSchema = z.object({
  status: z.enum(issueStatusValues).optional(),
  priority: z.enum(issuePriorityValues).optional()
})

const commentSchema = z.object({
  commentBody: z
    .string()
    .trim()
    .min(1, "Write a comment")
    .max(1200, "Keep it under 1200 characters")
})

const issueState = ds.state({
  commentBody: "",
  _validation: {
    commentBody: ""
  }
})

const IssuePage = (props: { detail: IssueDetail }) => (
  <main class="min-h-screen bg-bg text-fg" {...issueState.attrs()}>
    <div
      {...ds.onIntersect(ds.get(`/issues/${props.detail.issue.id}/live`), { once: true })}
      class="absolute w-px h-px overflow-hidden"
    ></div>
    <section class="mx-auto flex w-full max-w-3xl flex-col gap-5 p-5 lg:p-8">
      <a
        href="/workspace"
        class="text-[13px] font-medium text-fg-secondary hover:text-fg hover:underline"
      >
        Back to workspace
      </a>
      <IssuePageContent detail={props.detail} />
    </section>
  </main>
)

export const IssuePageContent = (props: { detail: IssueDetail | null }) => (
  <div id="issue-page-content">
    {props.detail === null ? null : <IssueDetailView detail={props.detail} />}
  </div>
)

const IssueDetailView = (props: { detail: IssueDetail }) => {
  const { issue, comments: issueComments } = props.detail
  return (
    <div class="flex flex-col gap-5">
      <div>
        <div class="font-mono text-[12px] text-fg-muted mb-1 tracking-tight">
          {issue.projectKey}-{issue.number}
        </div>
        <h2 class="text-[15px] font-semibold text-fg leading-snug tracking-tight">{issue.title}</h2>
        <p
          class={`mt-2 text-[13px] leading-relaxed ${issue.description ? "text-fg-secondary" : "text-fg-muted italic"}`}
        >
          {issue.description || "No description provided."}
        </p>
      </div>

      <div>
        <h3 class="text-[11px] font-bold tracking-widest uppercase text-fg-muted mb-3">
          Properties
        </h3>
        <form
          class="flex flex-col"
          {...ds.on("change", ds.patch(`/issues/${issue.id}`, { contentType: "form" }))}
        >
          <div class="grid grid-cols-[80px_1fr] items-center gap-3 py-2 border-b border-border-subtle">
            <label class="text-[11px] font-bold tracking-widest uppercase text-fg-muted">
              Status
            </label>
            <select
              name="status"
              class="w-full border border-transparent hover:border-border hover:bg-surface-hover px-2 py-1.5 bg-transparent text-fg text-sm cursor-pointer transition-colors appearance-none"
            >
              {issueStatuses.map((status) => (
                <option value={status.value} selected={issue.status === status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div class="grid grid-cols-[80px_1fr] items-center gap-3 py-2 border-b border-border-subtle">
            <label class="text-[11px] font-bold tracking-widest uppercase text-fg-muted">
              Priority
            </label>
            <select
              name="priority"
              class="w-full border border-transparent hover:border-border hover:bg-surface-hover px-2 py-1.5 bg-transparent text-fg text-sm cursor-pointer transition-colors appearance-none"
            >
              {issuePriorities.map((priority) => (
                <option value={priority.value} selected={issue.priority === priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      <div>
        <h3 class="text-[11px] font-bold tracking-widest uppercase text-fg-muted mb-3">
          Comments ({issueComments.length})
        </h3>
        {issueComments.length === 0 ? (
          <p class="text-fg-muted text-[13px]">No comments yet.</p>
        ) : (
          <div class="flex flex-col gap-3">
            {issueComments.map((comment) => (
              <article class="flex flex-col gap-1 bg-surface-card border border-border p-3">
                <span class="text-[13px] font-semibold text-fg-secondary">
                  {comment.authorName}
                </span>
                <p class="text-[13px] text-fg-secondary leading-relaxed">{comment.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <form
        class="flex flex-col gap-3"
        {...ds.on("submit", ds.post(`/issues/${issue.id}/comments`), { prevent: true })}
      >
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Add a comment
          <textarea
            rows={3}
            placeholder="Write a comment..."
            {...ds.bind(issueState.$.commentBody)}
          ></textarea>
          <small
            class="text-danger text-[13px] font-medium min-h-4"
            {...ds.text(issueState.$._validation.commentBody)}
          ></small>
        </label>
        <button type="submit" class="primary self-start">
          Post comment
        </button>
      </form>
    </div>
  )
}

export const registerIssuePage = (app: App) => {
  app.get("/issues/:id", async (c) => {
    const issueId = issueIdParam.parse(c.req.param("id"))
    const detail = await loadIssue(issueId)
    if (detail === null) {
      throw new HTTPException(404)
    }

    return reply.page(<IssuePage detail={detail} />, {
      title: `${detail.issue.projectKey}-${detail.issue.number} · Linear clone`,
      head: pageHead
    })
  })

  app.get("/issues/:id/live", async (c) => {
    const issueId = issueIdParam.parse(c.req.param("id"))
    const render = async () => event.patch(<IssuePageContent detail={await loadIssue(issueId)} />)

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
    const parsedIssueUpdate = updateIssueSchema.safeParse(await c.req.parseBody())
    if (!parsedIssueUpdate.success) {
      return reply.done()
    }

    await updateIssue(issueId, parsedIssueUpdate.data)
    invalidations.publish()
    return reply.patch(<IssuePageContent detail={await loadIssue(issueId)} />)
  })

  app.post("/issues/:id/comments", async (c) => {
    const issueId = issueIdParam.parse(c.req.param("id"))
    const parsedComment = commentSchema.safeParse(await read.signals(c.req.raw))
    if (!parsedComment.success) {
      const { fieldErrors } = z.flattenError(parsedComment.error)
      return reply.signals(
        issueState.patch({
          _validation: {
            ...issueState.defaults._validation,
            commentBody: fieldErrors.commentBody?.[0] ?? ""
          }
        })
      )
    }

    await createComment(c.get("user"), issueId, parsedComment.data.commentBody)
    invalidations.publish()
    return reply.stream([
      event.signals(
        issueState.patch({
          ...issueState.defaults,
          _validation: { ...issueState.defaults._validation }
        })
      ),
      event.patch(<IssuePageContent detail={await loadIssue(issueId)} />)
    ])
  })
}
