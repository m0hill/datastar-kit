import { Hono } from "hono"
import { trimTrailingSlash } from "hono/trailing-slash"
import docs from "./pages/docs"
import index from "./pages/index"
import { notFound } from "./pages/not-found"
import playground from "./pages/playground"

export type Env = { Bindings: CloudflareBindings }

const app = new Hono<Env>()

app.use(trimTrailingSlash())

app.route("/", index).route("/playground", playground).route("/docs", docs)

app.notFound(notFound)

export default app
