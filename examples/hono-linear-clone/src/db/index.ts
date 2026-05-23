import { drizzle } from "drizzle-orm/node-sqlite"
import * as schema from "./schema.js"

export const db = drizzle("data.sqlite", { schema })
