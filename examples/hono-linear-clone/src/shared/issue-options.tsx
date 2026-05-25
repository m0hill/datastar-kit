import type { IssuePriority, IssueStatus } from "../db/schema.js"

export const issueStatuses: Array<{ value: IssueStatus; label: string; dotClass: string }> = [
  { value: "backlog", label: "Backlog", dotClass: "bg-border-strong" },
  { value: "todo", label: "Todo", dotClass: "bg-fg-secondary" },
  { value: "in_progress", label: "In Progress", dotClass: "bg-warning" },
  { value: "done", label: "Done", dotClass: "bg-success" },
  { value: "canceled", label: "Canceled", dotClass: "bg-danger" }
]

export const issuePriorities: Array<{ value: IssuePriority; label: string }> = [
  { value: "none", label: "No priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
]
