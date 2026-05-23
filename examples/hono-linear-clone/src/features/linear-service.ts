import { and, asc, count, desc, eq, max, sql } from "drizzle-orm"
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
import { hashPassword, verifyPassword } from "../auth/passwords.js"

export const createUser = async (input: { name: string; username: string; password: string }) => {
  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      username: input.username.toLowerCase(),
      passwordHash: await hashPassword(input.password)
    })
    .returning()
  if (user === undefined) {
    throw new Error("Failed to create user")
  }
  return user
}

export const authenticate = async (input: { username: string; password: string }) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, input.username.toLowerCase()))
    .limit(1)

  if (user === undefined || !(await verifyPassword(input.password, user.passwordHash))) {
    return null
  }

  return user
}

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

export const createProject = async (
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

export const createIssue = async (
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

export const updateIssue = async (
  issueId: number,
  input: { status?: IssueStatus | undefined; priority?: IssuePriority | undefined }
) => {
  await db
    .update(issues)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(issues.id, issueId))
}

export const createComment = async (user: User, issueId: number, body: string) => {
  await db.insert(comments).values({
    issueId,
    authorId: user.id,
    body
  })
  await db.update(issues).set({ updatedAt: new Date() }).where(eq(issues.id, issueId))
}
