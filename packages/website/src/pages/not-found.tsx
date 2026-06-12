import { reply } from "datastar-kit"
import { pageHead, type App } from "../app"
import { SiteFooter, SiteHeader } from "../layout"

const NotFoundPage = () => (
  <div class="flex min-h-dvh flex-col">
    <SiteHeader />
    <main class="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p class="font-mono text-sm text-accent-bright">404</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-fg">Page not found</h1>
      <p class="mt-3 text-fg-secondary">
        Nothing lives at this URL. Try the docs map or head back home.
      </p>
      <div class="mt-8 flex gap-3">
        <a
          href="/docs"
          class="btn-primary"
        >
          Docs map
        </a>
        <a
          href="/"
          class="btn-secondary"
        >
          Home
        </a>
      </div>
    </main>
    <SiteFooter />
  </div>
)

export const registerNotFoundPage = (app: App) => {
  app.notFound(() =>
    reply.page(
      <NotFoundPage />,
      { title: "Not found · Datastar Kit", head: pageHead({}) },
      { status: 404 }
    )
  )
}
