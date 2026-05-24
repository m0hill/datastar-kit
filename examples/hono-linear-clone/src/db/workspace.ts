import { and, asc, count, desc, eq, sql } from "drizzle-orm"
import { db } from "./index.js"
import { issues, projects, users, type User } from "./schema.js"

export const readWorkspaceProjects = async () =>
  db
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

export const readWorkspaceIssues = async () =>
  db
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
