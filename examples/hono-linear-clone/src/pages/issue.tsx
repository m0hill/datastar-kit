import { HTTPException } from "hono/http-exception"
import { asc, eq, max } from "drizzle-orm"
import { ds, event, read, reply } from "datastar-kit"
import { z } from "zod"
import type { App } from "../app-types.js"
import { db } from "../db/index.js"
import {
  comments,
  issues,
  projects,
  users,
  type IssuePriority,
  type IssueStatus,
  type User
} from "../db/schema.js"
import { readWorkspaceIssues } from "../db/workspace.js"
import { invalidations } from "../realtime/hub.js"
import {
  issuePriorities,
  issuePriorityValues,
  issueStatuses,
  issueStatusValues
} from "../shared/issue-options.js"
import { Empty, FieldError, firstErrors } from "../shared/ui.js"
import { Board, workspaceSignals, workspaceState } from "./workspace.js"

const issueIdParam = z.coerce.number().int().positive()

const createIssueSchema = z.object({
  projectId: z.coerce.number().int().positive("Create a project first"),
  issueTitle: z.string().trim().min(3, "Write a clear title"),
  issueDescription: z.string().trim().max(2000, "Keep it under 2000 characters").optional(),
  issueStatus: z.enum(issueStatusValues),
  issuePriority: z.enum(issuePriorityValues)
})

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

const workspaceValidationPatch = (errors: Partial<typeof workspaceSignals._validation>) =>
  reply.signals(
    workspaceState.patch({ _validation: { ...workspaceSignals._validation, ...errors } })
  )

export const loadIssue = async (issueId: number) => {
  const [issue] = await db
    .select({
      id: issues.id,
      number: issues.number,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      projectKey: projects.key,
      projectName: projects.name,
      creatorName: users.name
    })
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .innerJoin(users, eq(users.id, issues.createdById))
    .where(eq(issues.id, issueId))
    .limit(1)

  if (issue === undefined) {
    return null
  }

  const issueComments = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorName: users.name
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.issueId, issueId))
    .orderBy(asc(comments.createdAt))

  return { issue, comments: issueComments }
}

export type IssueDetail = NonNullable<Awaited<ReturnType<typeof loadIssue>>>

const createIssue = async (
  user: User,
  input: {
    projectId: number
    issueTitle: string
    issueDescription?: string | undefined
    issueStatus: IssueStatus
    issuePriority: IssuePriority
  }
) => {
  const [last] = await db
    .select({ number: max(issues.number) })
    .from(issues)
    .where(eq(issues.projectId, input.projectId))
  const nextNumber = (last?.number ?? 0) + 1

  const [issue] = await db
    .insert(issues)
    .values({
      projectId: input.projectId,
      number: nextNumber,
      title: input.issueTitle,
      description: input.issueDescription ?? "",
      status: input.issueStatus,
      priority: input.issuePriority,
      createdById: user.id,
      assigneeId: user.id,
      updatedAt: new Date()
    })
    .returning()

  if (issue === undefined) {
    throw new Error("Failed to create issue")
  }

  return issue
}

const updateIssue = async (
  issueId: number,
  input: { status?: IssueStatus | undefined; priority?: IssuePriority | undefined }
) => {
  await db
    .update(issues)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(issues.id, issueId))
}

const createComment = async (user: User, issueId: number, body: string) => {
  await db.insert(comments).values({
    issueId,
    authorId: user.id,
    body
  })
  await db.update(issues).set({ updatedAt: new Date() }).where(eq(issues.id, issueId))
}

export const IssuePanel = (props: { detail: IssueDetail | null }) => (
  <aside
    id="issue-panel"
    class="bg-surface border-t lg:border-t-0 lg:border-l border-border p-4 lg:p-5 overflow-auto min-w-0"
  >
    {props.detail === null ? null : (
      <div
        {...ds.onIntersect(ds.get(`/issues/${props.detail.issue.id}/live`), { once: true })}
        class="absolute w-px h-px overflow-hidden"
      ></div>
    )}
    <IssuePanelContent detail={props.detail} />
  </aside>
)

export const IssuePanelContent = (props: { detail: IssueDetail | null }) => (
  <div id="issue-panel-content">
    {props.detail === null ? (
      <div class="grid place-items-center h-full text-center gap-3 min-h-50">
        <div>
          <h2 class="text-[15px] font-semibold text-fg-muted mb-1">No issue selected</h2>
          <p class="text-[13px] text-fg-muted">
            Select an issue to view details, change status, or add comments.
          </p>
        </div>
      </div>
    ) : (
      <IssueDetailView detail={props.detail} />
    )}
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
          <Empty>No comments yet.</Empty>
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
            {...ds.bind(workspaceState.$.commentBody)}
          ></textarea>
          <FieldError path={workspaceState.$._validation.commentBody} />
        </label>
        <button type="submit" class="primary self-start">
          Post comment
        </button>
      </form>
    </div>
  )
}

export const registerIssuePage = (app: App) => {
  app.post("/issues", async (c) => {
    const parsedIssue = createIssueSchema.safeParse(await read.signals(c.req.raw))
    if (!parsedIssue.success) {
      const errors = firstErrors(parsedIssue.error)
      return workspaceValidationPatch({
        form: errors.field("projectId"),
        issueTitle: errors.field("issueTitle")
      })
    }

    const issue = await createIssue(c.get("user"), parsedIssue.data)
    invalidations.publish()
    const issues = await readWorkspaceIssues()
    return reply.stream([
      event.signals(
        workspaceState.patch({
          issueTitle: "",
          issueDescription: "",
          commentBody: "",
          modalOpen: false,
          _validation: workspaceSignals._validation
        })
      ),
      event.patch(<Board issues={issues} />),
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
    const parsedIssueUpdate = updateIssueSchema.safeParse(await c.req.parseBody())
    if (!parsedIssueUpdate.success) {
      return reply.done()
    }

    await updateIssue(issueId, parsedIssueUpdate.data)
    invalidations.publish()
    const [issues, detail] = await Promise.all([readWorkspaceIssues(), loadIssue(issueId)])
    return reply.stream([
      event.patch(<Board issues={issues} />),
      event.patch(<IssuePanelContent detail={detail} />)
    ])
  })

  app.post("/issues/:id/comments", async (c) => {
    const issueId = issueIdParam.parse(c.req.param("id"))
    const parsedComment = commentSchema.safeParse(await read.signals(c.req.raw))
    if (!parsedComment.success) {
      const errors = firstErrors(parsedComment.error)
      return workspaceValidationPatch({ commentBody: errors.field("commentBody") })
    }

    await createComment(c.get("user"), issueId, parsedComment.data.commentBody)
    invalidations.publish()
    return reply.stream([
      event.signals(
        workspaceState.patch({ commentBody: "", _validation: workspaceSignals._validation })
      ),
      event.patch(<IssuePanelContent detail={await loadIssue(issueId)} />)
    ])
  })
}
