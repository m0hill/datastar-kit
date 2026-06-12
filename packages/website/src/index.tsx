import { Hono } from "hono"
import type { AppBindings } from "./app"
import { registerDocsPages } from "./pages/docs"
import { registerHomePage } from "./pages/home"
import { registerNotFoundPage } from "./pages/not-found"
import { registerPlaygroundPage } from "./pages/playground"
import { registerSearchRoute } from "./search"

const app = new Hono<AppBindings>()

registerHomePage(app)
registerPlaygroundPage(app)
registerDocsPages(app)
registerSearchRoute(app)
registerNotFoundPage(app)

export default app
