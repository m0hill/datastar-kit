import { randomBytes } from "node:crypto"
import { and, eq, gt } from "drizzle-orm"
import type { Context, MiddlewareHandler } from "hono"
import { getCookie, setCookie } from "hono/cookie"
import { db } from "../db/index.js"
import { sessions, users, type User } from "../db/schema.js"

const cookieName = "linear_session"
const sessionMs = 1000 * 60 * 60 * 24 * 14

export type AppVariables = {
  user: User
}

export const createSession = async (userId: number) => {
  const id = randomBytes(32).toString("base64url")
  await db.insert(sessions).values({
    id,
    userId,
    expiresAt: new Date(Date.now() + sessionMs)
  })
  return id
}

export const setSessionCookie = (c: Context, sessionId: string) => {
  setCookie(c, cookieName, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: Math.floor(sessionMs / 1000)
  })
}

export const clearSessionCookie = (c: Context) => {
  setCookie(c, cookieName, "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0
  })
}

export const deleteSession = async (sessionId: string | undefined) => {
  if (sessionId !== undefined) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
  }
}

export const currentUser = async (c: Context): Promise<User | null> => {
  const sessionId = getCookie(c, cookieName)
  if (sessionId === undefined) {
    return null
  }

  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1)

  return row?.user ?? null
}

export const requireUser: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const user = await currentUser(c)
  if (user === null) {
    return c.redirect("/login")
  }

  c.set("user", user)
  await next()
}
