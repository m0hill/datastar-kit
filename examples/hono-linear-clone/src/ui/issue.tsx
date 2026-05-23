import { ds } from "datastar-kit"
import type { IssueDetail } from "../features/linear-service.js"
import { Empty } from "./layout.js"
import { appState } from "./state.js"
import { FieldError, priorities, statuses } from "./workspace.js"

export const IssuePanel = (props: { detail: IssueDetail | null }) => (
  <aside id="issue-panel" class="panel">
    {props.detail === null ? null : (
      <div
        {...ds.onIntersect(ds.get(`/issues/${props.detail.issue.id}/live`), { once: true })}
        style="position:absolute;width:1px;height:1px;overflow:hidden"
      ></div>
    )}
    <IssuePanelContent detail={props.detail} />
  </aside>
)

export const IssuePanelContent = (props: { detail: IssueDetail | null }) => (
  <div id="issue-panel-content">
    {props.detail === null ? (
      <>
        <h2>No issue selected</h2>
        <Empty>Select an issue to view details, change status, or add comments.</Empty>
      </>
    ) : (
      <IssueDetailView detail={props.detail} />
    )}
  </div>
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
