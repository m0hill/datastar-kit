import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const drizzleDir = path.join(root, "drizzle")
const migrationsDir = path.join(root, "migrations")

mkdirSync(migrationsDir, { recursive: true })

if (!existsSync(drizzleDir)) {
  console.log("No Drizzle migrations found.")
  process.exit(0)
}

const migrationNames = readdirSync(drizzleDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .toSorted()

for (const migrationName of migrationNames) {
  const source = path.join(drizzleDir, migrationName, "migration.sql")
  if (!existsSync(source)) {
    continue
  }

  const target = path.join(migrationsDir, `${migrationName}.sql`)
  copyFileSync(source, target)
  console.log(`Synced ${path.relative(root, target)}`)
}
