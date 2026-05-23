import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-sqlite"
import * as schema from "./schema.js"

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

export const dbFileName = process.env.DB_FILE_NAME ?? resolve(rootDir, "data.sqlite")
export const db = drizzle(dbFileName, { schema })
