import { defineConfig } from "drizzle-kit"

const dbFileName = process.env.DB_FILE_NAME ?? "data.sqlite"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: dbFileName
  }
})
