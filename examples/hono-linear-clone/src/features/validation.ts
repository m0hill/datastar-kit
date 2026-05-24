import { z } from "zod"

const username = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters")
  .max(24, "Keep it under 24 characters")
  .regex(/^[a-z0-9_-]+$/i, "Use letters, numbers, underscores, or dashes")

export const authSignals = {
  username: "",
  password: "",
  name: "",
  errors: {
    form: "",
    username: "",
    password: "",
    name: ""
  }
}

export const loginSchema = z.object({
  username,
  password: z.string().min(1, "Enter your password")
})

export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Enter your name"),
  password: z.string().min(8, "Use at least 8 characters")
})

export const appSignals = {
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
  errors: {
    form: "",
    projectName: "",
    projectKey: "",
    issueTitle: "",
    commentBody: ""
  }
}

export const projectSchema = z.object({
  projectName: z.string().trim().min(2, "Name the project"),
  projectKey: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters")
    .max(8, "Keep keys short")
    .regex(/^[A-Z0-9]+$/i, "Use letters and numbers"),
  projectDescription: z.string().trim().max(240, "Keep it under 240 characters").optional()
})

export const issueSchema = z.object({
  projectId: z.coerce.number().int().positive("Create a project first"),
  issueTitle: z.string().trim().min(3, "Write a clear title"),
  issueDescription: z.string().trim().max(2000, "Keep it under 2000 characters").optional(),
  issueStatus: z.enum(["backlog", "todo", "in_progress", "done", "canceled"]),
  issuePriority: z.enum(["none", "low", "medium", "high", "urgent"])
})

export const updateIssueSchema = z.object({
  status: z.enum(["backlog", "todo", "in_progress", "done", "canceled"]).optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional()
})

export const commentSchema = z.object({
  commentBody: z
    .string()
    .trim()
    .min(1, "Write a comment")
    .max(1200, "Keep it under 1200 characters")
})

export const errorsFrom = (error: z.ZodError): Record<string, string[] | undefined> =>
  z.flattenError(error).fieldErrors
