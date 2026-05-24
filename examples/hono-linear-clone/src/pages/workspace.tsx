import { getCookie } from "hono/cookie"
import { and, asc, count, desc, eq, sql } from "drizzle-orm"
import { ds, event, read, reply } from "datastar-kit"
import { z } from "zod"
import type { App } from "../app-types.js"
import { deleteSessionCookie, deleteSession } from "../auth/session.js"
import { db } from "../db/index.js"
import { issues, projects, users, type User } from "../db/schema.js"
import { invalidations } from "../realtime/hub.js"
import { FieldError, Empty, firstErrors, isUniqueConstraintError, pageHead } from "../shared/ui.js"
import { issuePriorities, issueStatuses, StatusDot } from "../shared/issue-options.js"

export const workspaceSignals = {
  projectId: "",
  projectName: "",
  projectKey: "",
  projectDescription: "",
  issueTitle: "",
  issueDescription: "",
  issueStatus: "todo",
  issuePriority: "medium",
  commentBody: "",
  modalOpen: false,
  _validation: {
    form: "",
    projectName: "",
    projectKey: "",
    issueTitle: "",
    commentBody: ""
  }
}

export const workspaceState = ds.state(workspaceSignals)

const projectSchema = z.object({
  projectName: z.string().trim().min(2, "Name the project"),
  projectKey: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters")
    .max(8, "Keep keys short")
    .regex(/^[A-Z0-9]+$/i, "Use letters and numbers"),
  projectDescription: z.string().trim().max(240, "Keep it under 240 characters").optional()
})

const workspaceValidationPatch = (errors: Partial<typeof workspaceSignals._validation>) =>
  reply.signals(
    workspaceState.patch({ _validation: { ...workspaceSignals._validation, ...errors } })
  )

export const loadWorkspace = async () => {
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      key: projects.key,
      description: projects.description,
      openIssues: count(issues.id)
    })
    .from(projects)
    .leftJoin(issues, and(eq(issues.projectId, projects.id), sql`${issues.status} != 'done'`))
    .groupBy(projects.id)
    .orderBy(asc(projects.name))

  const issueRows = await db
    .select({
      id: issues.id,
      number: issues.number,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      updatedAt: issues.updatedAt,
      projectId: projects.id,
      projectKey: projects.key,
      projectName: projects.name,
      assigneeName: users.name
    })
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .leftJoin(users, eq(users.id, issues.assigneeId))
    .orderBy(desc(issues.updatedAt), desc(issues.id))

  const userRows = await db.select().from(users).orderBy(asc(users.name))
  return { projects: projectRows, issues: issueRows, users: userRows }
}

export type Workspace = Awaited<ReturnType<typeof loadWorkspace>>

const createProject = async (
  user: User,
  input: { projectName: string; projectKey: string; projectDescription?: string | undefined }
) => {
  const [project] = await db
    .insert(projects)
    .values({
      name: input.projectName,
      key: input.projectKey.toUpperCase(),
      description: input.projectDescription ?? "",
      createdById: user.id
    })
    .returning()

  if (project === undefined) {
    throw new Error("Failed to create project")
  }

  return project
}

const Sidebar = (props: { user: User; workspace: Workspace }) => (
  <aside
    id="sidebar"
    class="bg-surface border-r border-border text-fg-muted p-4 flex flex-col gap-5 overflow-y-auto min-w-0 w-full"
  >
    <div class="flex items-center gap-2 text-fg font-mono text-[13px] font-semibold tracking-wide">
      <span class="text-fg-muted text-lg leading-none">›</span>
      <span>Linear Clone</span>
    </div>

    <div class="flex items-center gap-2 text-[13px] text-fg-secondary px-2 py-1.5 bg-surface-inset border border-border-subtle">
      <span class="w-5 h-5 bg-border flex items-center justify-center text-[10px] font-bold text-fg-secondary font-mono">
        {props.user.name.charAt(0).toUpperCase()}
      </span>
      <span class="truncate">{props.user.name}</span>
    </div>

    <div class="flex flex-col gap-1">
      <h2 class="text-[11px] font-bold tracking-widest uppercase text-fg-muted px-2">Projects</h2>
      <ProjectList workspace={props.workspace} />
    </div>

    <div class="flex flex-col gap-1">
      <h2 class="text-[11px] font-bold tracking-widest uppercase text-fg-muted px-2">
        New Project
      </h2>
      <form
        class="flex flex-col gap-3 px-2"
        {...ds.on("submit", ds.post("/projects"), { prevent: true })}
      >
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Name
          <input placeholder="Engineering" {...ds.bind(workspaceState.$.projectName)} />
          <FieldError path={workspaceState.$._validation.projectName} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Key
          <input placeholder="ENG" maxlength={8} {...ds.bind(workspaceState.$.projectKey)} />
          <FieldError path={workspaceState.$._validation.projectKey} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Description
          <textarea rows={2} {...ds.bind(workspaceState.$.projectDescription)}></textarea>
        </label>
        <button type="submit" class="primary">
          Create project
        </button>
      </form>
    </div>

    <form method="post" action="/logout" class="mt-auto px-2">
      <button type="submit" class="w-full">
        Sign out
      </button>
    </form>
  </aside>
)

const ProjectList = (props: { workspace: Workspace }) => (
  <div class="flex flex-col">
    {props.workspace.projects.length === 0 ? (
      <Empty>Create a project to start tracking work.</Empty>
    ) : (
      props.workspace.projects.map((project) => (
        <div class="flex items-center gap-2 px-2 py-1.5 text-[13px] text-fg-secondary hover:bg-surface-hover hover:text-fg transition-colors cursor-default">
          <span class="font-mono font-semibold text-fg text-[12px] min-w-8">
            {project.key}
          </span>
          <span class="truncate">{project.name}</span>
          <span class="ml-auto font-mono text-[11px] text-fg-muted">{project.openIssues}</span>
        </div>
      ))
    )}
  </div>
)

const StatusLabel = ({ status }: { status: Workspace["issues"][number]["status"] }) => {
  const currentStatus = issueStatuses.find((x) => x.value === status)
  if (!currentStatus) return <span class="text-fg-muted">{status}</span>
  return (
    <span class="flex items-center gap-1.5 text-[11px] font-mono text-fg-secondary">
      <StatusDot class={currentStatus.dotClass} />
      {currentStatus.label}
    </span>
  )
}

const PriorityBadge = ({ priority }: { priority: Workspace["issues"][number]["priority"] }) => {
  const currentPriority = issuePriorities.find((x) => x.value === priority)
  if (!currentPriority) return null
  const color =
    priority === "urgent"
      ? "text-danger"
      : priority === "high"
        ? "text-warning"
        : priority === "medium"
          ? "text-fg-secondary"
          : priority === "low"
            ? "text-fg-muted"
            : "text-fg-muted/40"
  return (
    <span class={`text-[11px] font-mono font-semibold ${color}`}>
      {currentPriority.label.charAt(0).toUpperCase()}
    </span>
  )
}

const AssigneeCell = ({ name }: { name: string | null }) => {
  if (!name) return <span class="text-fg-muted/40">-</span>
  return (
    <span class="flex items-center gap-1.5 text-[11px] text-fg-secondary">
      <span class="w-4 h-4 bg-border flex items-center justify-center text-[9px] font-bold text-fg-secondary font-mono">
        {name.charAt(0).toUpperCase()}
      </span>
      {name}
    </span>
  )
}

export const Board = (props: { workspace: Workspace }) => (
  <section id="board" class="border border-border">
    <div class="grid grid-cols-[40px_100px_1fr_100px_60px_120px] gap-3 px-4 py-2 bg-surface border-b border-border text-[11px] font-bold tracking-widest uppercase text-fg-muted">
      <span></span>
      <span>ID</span>
      <span>Title</span>
      <span>Status</span>
      <span>Prio</span>
      <span>Assignee</span>
    </div>
    {props.workspace.issues.length === 0 ? (
      <div class="px-4 py-8">
        <Empty>No issues yet. Create one above.</Empty>
      </div>
    ) : (
      props.workspace.issues.map((issue) => (
        <article
          class="grid grid-cols-[40px_100px_1fr_100px_60px_120px] gap-3 px-4 py-2.5 border-b border-border-subtle items-center cursor-pointer transition-colors hover:bg-surface-hover"
          id={`issue-${issue.id}`}
          {...ds.on("click", ds.get(`/issues/${issue.id}`))}
        >
          <StatusDot
            class={
              issueStatuses.find((status) => status.value === issue.status)?.dotClass ?? "bg-border"
            }
          />
          <span class="font-mono text-[11px] text-fg-muted tabular-nums">
            {issue.projectKey}-{issue.number}
          </span>
          <span class="text-[13px] text-fg truncate">{issue.title}</span>
          <StatusLabel status={issue.status} />
          <PriorityBadge priority={issue.priority} />
          <AssigneeCell name={issue.assigneeName} />
        </article>
      ))
    )}
  </section>
)

export const IssueProjectSelect = (props: { workspace: Workspace }) => (
  <select id="issue-project-select" {...ds.bind(workspaceState.$.projectId)}>
    <option value="">Select project</option>
    {props.workspace.projects.map((project) => (
      <option value={project.id}>
        {project.key} · {project.name}
      </option>
    ))}
  </select>
)

const IssueModalForm = (props: { workspace: Workspace }) => (
  <form
    class="bg-surface-card border border-border w-full max-w-130 flex flex-col gap-4 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
    {...ds.on("submit", ds.post("/issues"), { prevent: true })}
    {...ds.on("click", ds.expr`evt.stopPropagation()`)}
  >
    <div class="flex items-center justify-between">
      <h3 class="text-[13px] font-semibold text-fg">Create issue</h3>
      <button
        type="button"
        class="text-fg-muted hover:text-fg"
        {...ds.on("click", ds.expr`${workspaceState.$.modalOpen} = false`)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
    <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
      Title
      <input
        placeholder="Fix keyboard focus after creating an issue"
        {...ds.bind(workspaceState.$.issueTitle)}
      />
      <FieldError path={workspaceState.$._validation.issueTitle} />
    </label>
    <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
      Description
      <textarea
        rows={3}
        placeholder="Add a description..."
        {...ds.bind(workspaceState.$.issueDescription)}
      ></textarea>
    </label>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Project
        <IssueProjectSelect workspace={props.workspace} />
        <FieldError path={workspaceState.$._validation.form} />
      </label>
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Status
        <select {...ds.bind(workspaceState.$.issueStatus)}>
          {issueStatuses.map((status) => (
            <option value={status.value}>{status.label}</option>
          ))}
        </select>
      </label>
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Priority
        <select {...ds.bind(workspaceState.$.issuePriority)}>
          {issuePriorities.map((priority) => (
            <option value={priority.value}>{priority.label}</option>
          ))}
        </select>
      </label>
    </div>
    <div class="flex justify-end gap-2 pt-1">
      <button type="button" {...ds.on("click", ds.expr`${workspaceState.$.modalOpen} = false`)}>
        Cancel
      </button>
      <button type="submit" class="primary">
        Create
      </button>
    </div>
  </form>
)

const IssueModal = (props: { workspace: Workspace }) => (
  <dialog
    id="issue-modal"
    class="bg-transparent p-0 m-0 max-w-none max-h-none w-full h-full border-0"
    {...ds.effect(
      ds.expr`${workspaceState.$.modalOpen} ? (!el.open && el.showModal()) : (el.open && el.close())`
    )}
    {...ds.on("click", ds.expr`evt.target === el && (${workspaceState.$.modalOpen} = false)`)}
    {...ds.on("close", ds.expr`${workspaceState.$.modalOpen} = false`)}
  >
    <div class="fixed inset-0 bg-black/60 flex items-start justify-center pt-[10vh] px-4">
      <div id="modal-content">
        <IssueModalForm workspace={props.workspace} />
      </div>
    </div>
  </dialog>
)

const EmptyIssuePanel = () => (
  <aside
    id="issue-panel"
    class="bg-surface border-t lg:border-t-0 lg:border-l border-border p-4 lg:p-5 overflow-auto min-w-0"
  >
    <div id="issue-panel-content">
      <div class="grid place-items-center h-full text-center gap-3 min-h-50">
        <div>
          <h2 class="text-[15px] font-semibold text-fg-muted mb-1">No issue selected</h2>
          <p class="text-[13px] text-fg-muted">
            Select an issue to view details, change status, or add comments.
          </p>
        </div>
      </div>
    </div>
  </aside>
)

const WorkspacePage = (props: { user: User; workspace: Workspace }) => (
  <main
    class="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] bg-bg"
    {...workspaceState.attrs()}
  >
    <div class="hidden lg:flex">
      <Sidebar user={props.user} workspace={props.workspace} />
    </div>
    <section class="p-5 lg:px-7 overflow-auto min-w-0">
      <div
        {...ds.onIntersect(ds.get("/app/live"), { once: true })}
        class="absolute w-px h-px overflow-hidden"
      ></div>
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-[13px] font-semibold text-fg">Issues</h2>
        <button type="button" class="primary" {...ds.on("click", ds.get("/modal/issue"))}>
          Create issue
        </button>
      </div>
      <Board workspace={props.workspace} />
      <IssueModal workspace={props.workspace} />
    </section>
    <EmptyIssuePanel />
  </main>
)

export const registerWorkspacePage = (app: App) => {
  app.get("/app", async (c) => {
    const workspace = await loadWorkspace()
    return reply.page(<WorkspacePage user={c.get("user")} workspace={workspace} />, {
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

  app.get("/modal/issue", async () => {
    const workspace = await loadWorkspace()
    return reply.stream([
      event.patch(<IssueProjectSelect workspace={workspace} />),
      event.signals(workspaceState.patch({ modalOpen: true }))
    ])
  })

  app.post("/projects", async (c) => {
    const parsedProject = projectSchema.safeParse(await read.signals(c.req.raw))
    if (!parsedProject.success) {
      const errors = firstErrors(parsedProject.error)
      return workspaceValidationPatch({
        projectName: errors.field("projectName"),
        projectKey: errors.field("projectKey")
      })
    }

    try {
      await createProject(c.get("user"), parsedProject.data)
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
      return workspaceValidationPatch({ projectKey: "Project keys must be unique" })
    }

    invalidations.publish()
    const workspace = await loadWorkspace()
    return reply.stream([
      event.signals(
        workspaceState.patch({
          projectName: "",
          projectKey: "",
          projectDescription: "",
          _validation: workspaceSignals._validation
        })
      ),
      event.patch(<Sidebar user={c.get("user")} workspace={workspace} />),
      event.patch(<Board workspace={workspace} />),
      event.patch(<IssueProjectSelect workspace={workspace} />)
    ])
  })

  app.post("/logout", async (c) => {
    await deleteSession(getCookie(c, "linear_session"))
    deleteSessionCookie(c)
    return c.redirect("/login")
  })
}
