import { ds } from "datastar-kit"
import type { HtmlChild } from "datastar-kit"
import type { IssuePriority, IssueStatus, User } from "../db/schema.js"
import type { IssueDetail, Workspace } from "../features/linear-service.js"
import { appState } from "./state.js"
import { Empty } from "./layout.js"

const statuses: Array<{ value: IssueStatus; label: string }> = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "canceled", label: "Canceled" }
]

const priorities: Array<{ value: IssuePriority; label: string }> = [
  { value: "none", label: "No priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
]

const FieldError = (props: { path: Parameters<typeof ds.text>[0] }) => (
  <small class="error" {...ds.text(props.path)}></small>
)

export const AppShell = (props: { user: User; workspace: Workspace }) => (
  <main class="shell" {...appState.attrs()}>
    <Sidebar user={props.user} workspace={props.workspace} />
    <section class="main">
      <div
        {...ds.onIntersect(ds.get("/app/live"), { once: true })}
        style="position:absolute;width:1px;height:1px;overflow:hidden"
      ></div>
      <IssueComposer workspace={props.workspace} />
      <Board workspace={props.workspace} />
    </section>
    <IssuePanel detail={null} />
  </main>
)

export const Sidebar = (props: { user: User; workspace: Workspace }) => (
  <aside id="sidebar" class="sidebar">
    <div>
      <h1>Linear clone</h1>
      <p class="meta">Signed in as {props.user.name}</p>
    </div>
    <form {...ds.on("submit", ds.post("/projects"), { prevent: true })}>
      <label>
        Project
        <input placeholder="Engineering" {...ds.bind(appState.$.projectName)} />
        <FieldError path={appState.$.errors.projectName} />
      </label>
      <label>
        Key
        <input placeholder="ENG" maxlength="8" {...ds.bind(appState.$.projectKey)} />
        <FieldError path={appState.$.errors.projectKey} />
      </label>
      <label>
        Description
        <textarea {...ds.bind(appState.$.projectDescription)}></textarea>
      </label>
      <button type="submit">Create project</button>
    </form>
    <ProjectList workspace={props.workspace} />
    <form method="post" action="/logout">
      <button class="secondary" type="submit">
        Sign out
      </button>
    </form>
  </aside>
)

const ProjectList = (props: { workspace: Workspace }) => (
  <div class="stack">
    {props.workspace.projects.length === 0 ? (
      <Empty>Create a project to start tracking work.</Empty>
    ) : (
      props.workspace.projects.map((project) => (
        <div class="meta">
          <span class="pill">{project.key}</span>
          <span>{project.name}</span>
          <span>{project.openIssues} open</span>
        </div>
      ))
    )}
  </div>
)

export const IssueComposer = (props: { workspace: Workspace }) => (
  <form
    id="issue-composer"
    class="issue-form stack"
    {...ds.on("submit", ds.post("/issues"), { prevent: true })}
  >
    <div class="toolbar">
      <h2>Workspace</h2>
      <button type="submit">Create issue</button>
    </div>
    <label>
      Project
      <select {...ds.bind(appState.$.projectId)}>
        <option value="">Select project</option>
        {props.workspace.projects.map((project) => (
          <option value={project.id}>
            {project.key} · {project.name}
          </option>
        ))}
      </select>
    </label>
    <label>
      Title
      <input
        placeholder="Fix keyboard focus after creating an issue"
        {...ds.bind(appState.$.issueTitle)}
      />
      <FieldError path={appState.$.errors.issueTitle} />
    </label>
    <label>
      Description
      <textarea {...ds.bind(appState.$.issueDescription)}></textarea>
    </label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
      <label>
        Status
        <select {...ds.bind(appState.$.issueStatus)}>
          {statuses.map((status) => (
            <option value={status.value}>{status.label}</option>
          ))}
        </select>
      </label>
      <label>
        Priority
        <select {...ds.bind(appState.$.issuePriority)}>
          {priorities.map((priority) => (
            <option value={priority.value}>{priority.label}</option>
          ))}
        </select>
      </label>
    </div>
    <FieldError path={appState.$.errors.form} />
  </form>
)

export const Board = (props: { workspace: Workspace }) => (
  <section id="board" class="board">
    {statuses.map((status) => (
      <Column status={status.value} title={status.label}>
        {props.workspace.issues
          .filter((issue) => issue.status === status.value)
          .map((issue) => (
            <article class="issue-card" id={`issue-${issue.id}`}>
              <button type="button" {...ds.on("click", ds.get(`/issues/${issue.id}`))}>
                <strong>{issue.title}</strong>
              </button>
              <div class="meta">
                <span>
                  {issue.projectKey}-{issue.number}
                </span>
                <span class="pill">{issue.priority}</span>
                <span>{issue.assigneeName ?? "Unassigned"}</span>
              </div>
            </article>
          ))}
      </Column>
    ))}
  </section>
)

const Column = (props: { title: string; status: IssueStatus; children: HtmlChild }) => (
  <div class="column">
    <h3>{props.title}</h3>
    {props.children}
  </div>
)

export const IssuePanel = (props: { detail: IssueDetail | null }) => (
  <aside id="issue-panel" class="panel">
    {props.detail === null ? (
      <>
        <h2>No issue selected</h2>
        <Empty>Select an issue to view details, change status, or add comments.</Empty>
      </>
    ) : (
      <IssueDetailView detail={props.detail} />
    )}
  </aside>
)

const IssueDetailView = (props: { detail: IssueDetail }) => {
  const { issue, comments } = props.detail
  return (
    <div class="stack">
      <div>
        <p class="meta">
          {issue.projectKey}-{issue.number}
        </p>
        <h2>{issue.title}</h2>
        <p>{issue.description || "No description."}</p>
      </div>
      <form
        class="stack"
        {...ds.on("change", ds.patch(`/issues/${issue.id}`, { contentType: "form" }))}
      >
        <label>
          Status
          <select name="status">
            {statuses.map((status) => (
              <option value={status.value} selected={issue.status === status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select name="priority">
            {priorities.map((priority) => (
              <option value={priority.value} selected={issue.priority === priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>
      </form>
      <section>
        <h3>Comments</h3>
        {comments.length === 0 ? (
          <Empty>No comments yet.</Empty>
        ) : (
          comments.map((comment) => (
            <article class="comment">
              <strong>{comment.authorName}</strong>
              <p>{comment.body}</p>
            </article>
          ))
        )}
      </section>
      <form
        class="stack"
        {...ds.on("submit", ds.post(`/issues/${issue.id}/comments`), { prevent: true })}
      >
        <label>
          Add comment
          <textarea {...ds.bind(appState.$.commentBody)}></textarea>
          <FieldError path={appState.$.errors.commentBody} />
        </label>
        <button type="submit">Comment</button>
      </form>
    </div>
  )
}
