import type { Hono } from "hono"
import type { User } from "./db/schema.js"

export type AppVariables = {
  user: User
}

export type AppBindings = {
  Variables: AppVariables
}

export type App = Hono<AppBindings>
