import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema.js"

export const database = (binding: D1Database | D1DatabaseSession) => drizzle(binding, { schema })

export type Database = ReturnType<typeof database>
