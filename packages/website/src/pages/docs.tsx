import { reply } from "datastar-kit"
import { pageHead, type App } from "../app"
import { docPages } from "../generated/docs"
import { DocsLayout } from "../layout"

export const registerDocsPages = (app: App) => {
  for (const page of docPages) {
    app.get(page.path, () =>
      reply.page(<DocsLayout page={page} />, {
        title: `${page.title} · Datastar Kit`,
        head: pageHead({
          ...(page.description === "" ? {} : { description: page.description }),
          path: page.path
        })
      })
    )
  }
}
