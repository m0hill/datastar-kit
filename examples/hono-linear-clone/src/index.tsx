import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { requireUser, type AppVariables } from "./auth/session.js"
import { registerAuthRoutes } from "./routes/auth.js"
import { registerIssueRoutes } from "./routes/issues.js"
import { registerWorkspaceRoutes } from "./routes/workspace.js"

const app = new Hono<{ Variables: AppVariables }>()

app.use("/public/*", serveStatic({ root: "./" }))

registerAuthRoutes(app)

app.use("/app/*", requireUser)
app.use("/app", requireUser)
app.use("/projects", requireUser)
app.use("/issues/*", requireUser)

registerWorkspaceRoutes(app)
registerIssueRoutes(app)

app.notFound((c) => c.text("Not Found", 404))

serve({ fetch: app.fetch }, () => {
  console.log("Hono Linear clone listening on http://localhost:3000")
})
