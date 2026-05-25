import { getCookie } from "hono/cookie"
import { ds, event, read, reply } from "datastar-kit"
import { z } from "zod"
import type { App } from "../app-types.js"
import { deleteSessionCookie, deleteSession } from "../auth/session.js"
import { createIssue, readIssues, type Issue } from "../db/issue.js"
import { createProject, readProjects, type Project } from "../db/workspace.js"
import { issuePriorityValues, issueStatusValues, type User } from "../db/schema.js"
import { invalidations } from "../realtime/hub.js"
import { pageHead } from "../shared/ui.js"
import { issuePriorities, issueStatuses } from "../shared/issue-options.js"

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

const createIssueSchema = z.object({
  projectId: z.coerce.number().int().positive("Create a project first"),
  issueTitle: z.string().trim().min(3, "Write a clear title"),
  issueDescription: z.string().trim().max(2000, "Keep it under 2000 characters").optional(),
  issueStatus: z.enum(issueStatusValues),
  issuePriority: z.enum(issuePriorityValues)
})

const state = ds.state({
  projectId: "",
  projectName: "",
  projectKey: "",
  projectDescription: "",
  issueTitle: "",
  issueDescription: "",
  issueStatus: "todo",
  issuePriority: "medium",
  modalOpen: false,
  _validation: {
    form: "",
    projectName: "",
    projectKey: "",
    issueTitle: ""
  }
})

const Sidebar = (props: { user: User; projects: Project[] }) => (
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
      <ProjectList projects={props.projects} />
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
          <input placeholder="Engineering" {...ds.bind(state.$.projectName)} />
          <small
            class="text-danger text-[13px] font-medium min-h-4"
            {...ds.text(state.$._validation.projectName)}
          ></small>
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Key
          <input placeholder="ENG" maxlength={8} {...ds.bind(state.$.projectKey)} />
          <small
            class="text-danger text-[13px] font-medium min-h-4"
            {...ds.text(state.$._validation.projectKey)}
          ></small>
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Description
          <textarea rows={2} {...ds.bind(state.$.projectDescription)}></textarea>
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

const ProjectList = (props: { projects: Project[] }) => (
  <div class="flex flex-col">
    {props.projects.length === 0 ? (
      <p class="text-fg-muted text-[13px]">Create a project to start tracking work.</p>
    ) : (
      props.projects.map((project) => (
        <div class="flex items-center gap-2 px-2 py-1.5 text-[13px] text-fg-secondary hover:bg-surface-hover hover:text-fg transition-colors cursor-default">
          <span class="font-mono font-semibold text-fg text-[12px] min-w-8">{project.key}</span>
          <span class="truncate">{project.name}</span>
          <span class="ml-auto font-mono text-[11px] text-fg-muted">{project.openIssues}</span>
        </div>
      ))
    )}
  </div>
)

const StatusLabel = ({ status }: { status: Issue["status"] }) => {
  const currentStatus = issueStatuses.find((x) => x.value === status)
  if (!currentStatus) return <span class="text-fg-muted">{status}</span>
  return (
    <span class="flex items-center gap-1.5 text-[11px] font-mono text-fg-secondary">
      <span class={`w-1.75 h-1.75 ${currentStatus.dotClass}`}></span>
      {currentStatus.label}
    </span>
  )
}

const PriorityBadge = ({ priority }: { priority: Issue["priority"] }) => {
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

export const Board = (props: { issues: Issue[] }) => (
  <section id="board" class="border border-border">
    <div class="grid grid-cols-[40px_100px_1fr_100px_60px_120px] gap-3 px-4 py-2 bg-surface border-b border-border text-[11px] font-bold tracking-widest uppercase text-fg-muted">
      <span></span>
      <span>ID</span>
      <span>Title</span>
      <span>Status</span>
      <span>Prio</span>
      <span>Assignee</span>
    </div>
    {props.issues.length === 0 ? (
      <div class="px-4 py-8">
        <p class="text-fg-muted text-[13px]">No issues yet. Create one above.</p>
      </div>
    ) : (
      props.issues.map((issue) => (
        <a
          href={`/issues/${issue.id}`}
          class="grid grid-cols-[40px_100px_1fr_100px_60px_120px] gap-3 px-4 py-2.5 border-b border-border-subtle items-center cursor-pointer transition-colors hover:bg-surface-hover"
          id={`issue-${issue.id}`}
        >
          <span
            class={`w-1.75 h-1.75 ${
              issueStatuses.find((status) => status.value === issue.status)?.dotClass ?? "bg-border"
            }`}
          ></span>
          <span class="font-mono text-[11px] text-fg-muted tabular-nums">
            {issue.projectKey}-{issue.number}
          </span>
          <span class="text-[13px] text-fg truncate">{issue.title}</span>
          <StatusLabel status={issue.status} />
          <PriorityBadge priority={issue.priority} />
          <AssigneeCell name={issue.assigneeName} />
        </a>
      ))
    )}
  </section>
)

export const IssueProjectSelect = (props: { projects: Project[] }) => (
  <select id="issue-project-select" {...ds.bind(state.$.projectId)}>
    <option value="">Select project</option>
    {props.projects.map((project) => (
      <option value={project.id}>
        {project.key} · {project.name}
      </option>
    ))}
  </select>
)

const IssueModalForm = (props: { projects: Project[] }) => (
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
        {...ds.on("click", ds.expr`${state.$.modalOpen} = false`)}
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
        {...ds.bind(state.$.issueTitle)}
      />
      <small
        class="text-danger text-[13px] font-medium min-h-4"
        {...ds.text(state.$._validation.issueTitle)}
      ></small>
    </label>
    <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
      Description
      <textarea
        rows={3}
        placeholder="Add a description..."
        {...ds.bind(state.$.issueDescription)}
      ></textarea>
    </label>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Project
        <IssueProjectSelect projects={props.projects} />
        <small
          class="text-danger text-[13px] font-medium min-h-4"
          {...ds.text(state.$._validation.form)}
        ></small>
      </label>
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Status
        <select {...ds.bind(state.$.issueStatus)}>
          {issueStatuses.map((status) => (
            <option value={status.value}>{status.label}</option>
          ))}
        </select>
      </label>
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Priority
        <select {...ds.bind(state.$.issuePriority)}>
          {issuePriorities.map((priority) => (
            <option value={priority.value}>{priority.label}</option>
          ))}
        </select>
      </label>
    </div>
    <div class="flex justify-end gap-2 pt-1">
      <button type="button" {...ds.on("click", ds.expr`${state.$.modalOpen} = false`)}>
        Cancel
      </button>
      <button type="submit" class="primary">
        Create
      </button>
    </div>
  </form>
)

const IssueModal = (props: { projects: Project[] }) => (
  <dialog
    id="issue-modal"
    class="bg-transparent p-0 m-0 max-w-none max-h-none w-full h-full border-0"
    {...ds.effect(
      ds.expr`${state.$.modalOpen} ? (!el.open && el.showModal()) : (el.open && el.close())`
    )}
    {...ds.on("click", ds.expr`evt.target === el && (${state.$.modalOpen} = false)`)}
    {...ds.on("close", ds.expr`${state.$.modalOpen} = false`)}
  >
    <div class="fixed inset-0 bg-black/60 flex items-start justify-center pt-[10vh] px-4">
      <div id="modal-content">
        <IssueModalForm projects={props.projects} />
      </div>
    </div>
  </dialog>
)

const Page = (props: { user: User; projects: Project[]; issues: Issue[] }) => (
  <main class="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr] bg-bg" {...state.attrs()}>
    <div class="hidden lg:flex">
      <Sidebar user={props.user} projects={props.projects} />
    </div>
    <section class="p-5 lg:px-7 overflow-auto min-w-0">
      <div
        {...ds.onIntersect(ds.get("/workspace/live"), { once: true })}
        class="absolute w-px h-px overflow-hidden"
      ></div>
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-[13px] font-semibold text-fg">Issues</h2>
        <button type="button" class="primary" {...ds.on("click", ds.get("/modal/issue"))}>
          Create issue
        </button>
      </div>
      <Board issues={props.issues} />
      <IssueModal projects={props.projects} />
    </section>
  </main>
)

export const registerWorkspacePage = (app: App) => {
  app.get("/workspace", async (c) => {
    const [projects, issues] = await Promise.all([readProjects(), readIssues()])
    return reply.page(<Page user={c.get("user")} projects={projects} issues={issues} />, {
      title: "Linear clone",
      head: pageHead
    })
  })

  app.get("/workspace/live", async (c) => {
    const user = c.get("user")

    const render = async () => {
      const [projects, issues] = await Promise.all([readProjects(), readIssues()])
      return [
        event.patch(<Sidebar user={user} projects={projects} />),
        event.patch(<Board issues={issues} />),
        event.patch(<IssueProjectSelect projects={projects} />)
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
    const projects = await readProjects()
    return reply.stream([
      event.patch(<IssueProjectSelect projects={projects} />),
      event.signals(state.patch({ modalOpen: true }))
    ])
  })

  app.post("/projects", async (c) => {
    const parsedProject = projectSchema.safeParse(await read.signals(c.req.raw))
    if (!parsedProject.success) {
      const { fieldErrors } = z.flattenError(parsedProject.error)
      return reply.signals(
        state.patch({
          _validation: {
            ...state.defaults._validation,
            projectName: fieldErrors.projectName?.[0] ?? "",
            projectKey: fieldErrors.projectKey?.[0] ?? ""
          }
        })
      )
    }

    const project = await createProject(c.get("user"), parsedProject.data)
    if (project === null) {
      return reply.signals(
        state.patch({
          _validation: {
            ...state.defaults._validation,
            projectKey: "Project keys must be unique"
          }
        })
      )
    }

    invalidations.publish()
    const projects = await readProjects()
    return reply.stream([
      event.signals(
        state.patch({
          ...state.defaults,
          _validation: { ...state.defaults._validation }
        })
      ),
      event.patch(<Sidebar user={c.get("user")} projects={projects} />),
      event.patch(<IssueProjectSelect projects={projects} />)
    ])
  })

  app.post("/issues", async (c) => {
    const parsedIssue = createIssueSchema.safeParse(await read.signals(c.req.raw))
    if (!parsedIssue.success) {
      const { fieldErrors } = z.flattenError(parsedIssue.error)
      return reply.signals(
        state.patch({
          _validation: {
            ...state.defaults._validation,
            form: fieldErrors.projectId?.[0] ?? "",
            issueTitle: fieldErrors.issueTitle?.[0] ?? ""
          }
        })
      )
    }

    const issue = await createIssue(c.get("user"), parsedIssue.data)
    invalidations.publish()
    return reply.navigate(`/issues/${issue.id}`)
  })

  app.post("/logout", async (c) => {
    await deleteSession(getCookie(c, "linear_session"))
    deleteSessionCookie(c)
    return c.redirect("/login")
  })
}
