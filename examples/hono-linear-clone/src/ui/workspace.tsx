import { ds } from "datastar-kit"
import type { IssuePriority, IssueStatus, User } from "../db/schema.js"
import type { Workspace } from "../features/linear-service.js"
import { Empty } from "./layout.js"
import { appState } from "./state.js"

export const statuses: Array<{ value: IssueStatus; label: string; dotClass: string }> = [
  { value: "backlog", label: "Backlog", dotClass: "bg-border-strong" },
  { value: "todo", label: "Todo", dotClass: "bg-fg-secondary" },
  { value: "in_progress", label: "In Progress", dotClass: "bg-warning" },
  { value: "done", label: "Done", dotClass: "bg-success" },
  { value: "canceled", label: "Canceled", dotClass: "bg-danger" }
]

export const priorities: Array<{ value: IssuePriority; label: string }> = [
  { value: "none", label: "No priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
]

export const StatusDot = ({ class: cls }: { class: string }) => (
  <span class={`w-[7px] h-[7px] ${cls}`}></span>
)

const PriorityBadge = ({ priority }: { priority: IssuePriority }) => {
  const p = priorities.find((x) => x.value === priority)
  if (!p) return null
  const color =
    priority === "urgent" ? "text-danger" :
    priority === "high" ? "text-warning" :
    priority === "medium" ? "text-fg-secondary" :
    priority === "low" ? "text-fg-muted" :
    "text-fg-muted/40"
  return <span class={`text-[11px] font-mono font-semibold ${color}`}>{p.label.charAt(0).toUpperCase()}</span>
}

export const FieldError = (props: { path: Parameters<typeof ds.text>[0] }) => (
  <small class="text-danger text-[13px] font-medium min-h-[1rem]" {...ds.text(props.path)}></small>
)

export const Sidebar = (props: { user: User; workspace: Workspace }) => (
  <aside id="sidebar" class="bg-surface border-r border-border text-fg-muted p-4 flex flex-col gap-5 overflow-y-auto min-w-0 w-full">
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
      <h2 class="text-[11px] font-bold tracking-widest uppercase text-fg-muted px-2">New Project</h2>
      <form class="flex flex-col gap-3 px-2" {...ds.on("submit", ds.post("/projects"), { prevent: true })}>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Name
          <input placeholder="Engineering" {...ds.bind(appState.$.projectName)} />
          <FieldError path={appState.$.errors.projectName} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Key
          <input placeholder="ENG" maxlength={8} {...ds.bind(appState.$.projectKey)} />
          <FieldError path={appState.$.errors.projectKey} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Description
          <textarea rows={2} {...ds.bind(appState.$.projectDescription)}></textarea>
        </label>
        <button type="submit" class="primary">Create project</button>
      </form>
    </div>

    <form method="post" action="/logout" class="mt-auto px-2">
      <button type="submit" class="w-full">Sign out</button>
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
          <span class="font-mono font-semibold text-fg text-[12px] min-w-[2rem]">{project.key}</span>
          <span class="truncate">{project.name}</span>
          <span class="ml-auto font-mono text-[11px] text-fg-muted">{project.openIssues}</span>
        </div>
      ))
    )}
  </div>
)

const StatusLabel = ({ status }: { status: IssueStatus }) => {
  const s = statuses.find((x) => x.value === status)
  if (!s) return <span class="text-fg-muted">{status}</span>
  return (
    <span class="flex items-center gap-1.5 text-[11px] font-mono text-fg-secondary">
      <StatusDot class={s.dotClass} />
      {s.label}
    </span>
  )
}

const AssigneeCell = ({ name }: { name: string | null }) => {
  if (!name) return <span class="text-fg-muted/40">—</span>
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
          <StatusDot class={statuses.find((s) => s.value === issue.status)?.dotClass ?? "bg-border"} />
          <span class="font-mono text-[11px] text-fg-muted tabular-nums">{issue.projectKey}-{issue.number}</span>
          <span class="text-[13px] text-fg truncate">{issue.title}</span>
          <StatusLabel status={issue.status} />
          <PriorityBadge priority={issue.priority} />
          <AssigneeCell name={issue.assigneeName} />
        </article>
      ))
    )}
  </section>
)
