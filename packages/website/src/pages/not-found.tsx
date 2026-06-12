import { reply } from "datastar-kit"
import { pageHead, type App } from "../app"
import { SiteFooter, SiteHeader } from "../layout"

const NotFoundPage = () => (
  <div class="flex min-h-dvh flex-col">
    <SiteHeader />
    <main class="site-shell flex flex-1 items-center justify-center py-24 text-center">
      <div class="blueprint-panel max-w-xl p-8 sm:p-10">
        <p class="manual-kicker">404</p>
        <h1 class="mt-3 font-serif text-5xl leading-none font-medium tracking-tighter text-fg">
          Page not found.
        </h1>
        <p class="mt-4 font-serif text-lg leading-relaxed text-fg-secondary">
          Nothing lives at this URL. Try the docs map or head back home.
        </p>
        <div class="mt-8 flex justify-center gap-3">
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
