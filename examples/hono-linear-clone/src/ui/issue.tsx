import { ds } from "datastar-kit"
import type { IssueDetail } from "../features/linear-service.js"
import { Empty } from "./layout.js"
import { appState } from "./state.js"
import { FieldError, priorities, StatusDot, statuses } from "./workspace.js"

export const IssuePanel = (props: { detail: IssueDetail | null }) => (
  <aside id="issue-panel" class="bg-surface border-t lg:border-t-0 lg:border-l border-border p-4 lg:p-5 overflow-auto min-w-0">
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
      <div class="grid place-items-center h-full text-center gap-3 min-h-[200px]">
        <div>
          <h2 class="text-[15px] font-semibold text-fg-muted mb-1">No issue selected</h2>
          <p class="text-[13px] text-fg-muted">Select an issue to view details, change status, or add comments.</p>
        </div>
      </div>
    ) : (
      <IssueDetailView detail={props.detail} />
    )}
  </div>
)

const IssueDetailView = (props: { detail: IssueDetail }) => {
  const { issue, comments } = props.detail
  return (
    <div class="flex flex-col gap-5">
      <div>
        <div class="font-mono text-[12px] text-fg-muted mb-1 tracking-tight">
          {issue.projectKey}-{issue.number}
        </div>
        <h2 class="text-[15px] font-semibold text-fg leading-snug tracking-tight">{issue.title}</h2>
        <p class={`mt-2 text-[13px] leading-relaxed ${issue.description ? "text-fg-secondary" : "text-fg-muted italic"}`}>
          {issue.description || "No description provided."}
        </p>
      </div>

      <div>
        <h3 class="text-[11px] font-bold tracking-widest uppercase text-fg-muted mb-3">Properties</h3>
        <div
          class="flex flex-col"
          {...ds.on("change", ds.patch(`/issues/${issue.id}`, { contentType: "form" }))}
        >
          <div class="grid grid-cols-[80px_1fr] items-center gap-3 py-2 border-b border-border-subtle">
            <label class="text-[11px] font-bold tracking-widest uppercase text-fg-muted">Status</label>
            <select
              name="status"
              class="w-full border border-transparent hover:border-border hover:bg-surface-hover px-2 py-1.5 bg-transparent text-fg text-sm cursor-pointer transition-colors appearance-none"
            >
              {statuses.map((status) => (
                <option value={status.value} selected={issue.status === status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div class="grid grid-cols-[80px_1fr] items-center gap-3 py-2 border-b border-border-subtle">
            <label class="text-[11px] font-bold tracking-widest uppercase text-fg-muted">Priority</label>
            <select
              name="priority"
              class="w-full border border-transparent hover:border-border hover:bg-surface-hover px-2 py-1.5 bg-transparent text-fg text-sm cursor-pointer transition-colors appearance-none"
            >
              {priorities.map((priority) => (
                <option value={priority.value} selected={issue.priority === priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-[11px] font-bold tracking-widest uppercase text-fg-muted mb-3">Comments ({comments.length})</h3>
        {comments.length === 0 ? (
          <Empty>No comments yet.</Empty>
        ) : (
          <div class="flex flex-col gap-3">
            {comments.map((comment) => (
              <article class="flex flex-col gap-1 bg-surface-card border border-border p-3">
                <span class="text-[13px] font-semibold text-fg-secondary">{comment.authorName}</span>
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
          <textarea rows={3} placeholder="Write a comment..." {...ds.bind(appState.$.commentBody)}></textarea>
          <FieldError path={appState.$.errors.commentBody} />
        </label>
        <button type="submit" class="primary self-start">Post comment</button>
      </form>
    </div>
  )
}
