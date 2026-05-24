import { ds } from "datastar-kit"
import type { Workspace } from "../features/linear-service.js"
import { appState } from "./state.js"
import { FieldError, priorities, statuses } from "./workspace.js"

export const IssueProjectSelect = (props: { workspace: Workspace }) => (
  <select id="issue-project-select" {...ds.bind(appState.$.projectId)}>
    <option value="">Select project</option>
    {props.workspace.projects.map((project) => (
      <option value={project.id}>{project.key} · {project.name}</option>
    ))}
  </select>
)

const ModalForm = (props: { workspace: Workspace }) => (
  <form
    class="bg-surface-card border border-border w-full max-w-[520px] flex flex-col gap-4 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
    {...ds.on("submit", ds.post("/issues"), { prevent: true })}
    {...ds.on("click", ds.expr`evt.stopPropagation()`)}
  >
    <div class="flex items-center justify-between">
      <h3 class="text-[13px] font-semibold text-fg">Create issue</h3>
      <button
        type="button"
        class="text-fg-muted hover:text-fg"
        {...ds.on("click", ds.expr`${appState.$.modalOpen} = false`)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
      Title
      <input
        placeholder="Fix keyboard focus after creating an issue"
        {...ds.bind(appState.$.issueTitle)}
      />
      <FieldError path={appState.$.errors.issueTitle} />
    </label>
    <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
      Description
      <textarea rows={3} placeholder="Add a description..." {...ds.bind(appState.$.issueDescription)}></textarea>
    </label>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Project
        <IssueProjectSelect workspace={props.workspace} />
        <FieldError path={appState.$.errors.form} />
      </label>
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Status
        <select {...ds.bind(appState.$.issueStatus)}>
          {statuses.map((status) => (
            <option value={status.value}>{status.label}</option>
          ))}
        </select>
      </label>
      <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
        Priority
        <select {...ds.bind(appState.$.issuePriority)}>
          {priorities.map((priority) => (
            <option value={priority.value}>{priority.label}</option>
          ))}
        </select>
      </label>
    </div>
    <div class="flex justify-end gap-2 pt-1">
      <button
        type="button"
        {...ds.on("click", ds.expr`${appState.$.modalOpen} = false`)}
      >
        Cancel
      </button>
      <button type="submit" class="primary">Create</button>
    </div>
  </form>
)

export const IssueModal = (props: { workspace: Workspace }) => (
  <dialog
    id="issue-modal"
    class="bg-transparent p-0 m-0 max-w-none max-h-none w-full h-full border-0"
    {...ds.effect(
      ds.expr`${appState.$.modalOpen} ? (!el.open && el.showModal()) : (el.open && el.close())`
    )}
    {...ds.on("click", ds.expr`evt.target === el && (${appState.$.modalOpen} = false)`)}
    {...ds.on("close", ds.expr`${appState.$.modalOpen} = false`)}
  >
    <div class="fixed inset-0 bg-black/60 flex items-start justify-center pt-[10vh] px-4">
      <div id="modal-content">
        <ModalForm workspace={props.workspace} />
      </div>
    </div>
  </dialog>
)
