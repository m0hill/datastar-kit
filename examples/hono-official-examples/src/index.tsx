import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { fileURLToPath } from "node:url"
import { Hono } from "hono"
import { indexPage } from "./layout.js"
import { examples } from "./registry.js"

const app = new Hono()

app.use("/public/*", serveStatic({ root: fileURLToPath(new URL("../", import.meta.url)) }))

app.get("/", () => indexPage())

for (const example of examples) {
  example.register(app)
}

app.notFound((c) => c.text("Not Found", 404))

const port = Number(process.env.PORT ?? "3000")
serve({ fetch: app.fetch, port }, () => {
  console.log(`Hono official Datastar examples listening on http://localhost:${port}`)
})
