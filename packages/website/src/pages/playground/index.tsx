import { mod, reply } from "datastar-kit"
import type { JSX } from "datastar-kit/jsx-runtime"
import { pageHead, type App } from "../../app"
import { SiteFooter, SiteHeader } from "../../layout"
import { GITHUB_URL } from "../../nav"
import { ComposerDemo, composerState } from "./composer"
import { registerStatusSearchDemo, StatusSearchDemo, statusSearchState } from "./status-search"
import { registerValidationDemo, validationState, ValidationDemo } from "./validation"

interface Demo {
  title: string
  body: string
  demo: JSX.Element
}

const demos: Demo[] = [
  {
    title: "Inline validation",
    body: "Signals carry the form to the worker. Zod validates on the server, and error messages come back as signal patches. No client-side validation code exists on this page.",
    demo: <ValidationDemo />
  },
  {
    title: "Active search",
    body: "Each keystroke is debounced into a GET request. The worker filters a constant dataset and patches the list back as HTML. The browser holds no data and no templates.",
    demo: <StatusSearchDemo />
  },
  {
    title: "Browser-only signals",
    body: "Not everything needs a round trip. These signals never leave the page: the character count and the clear button are plain Datastar expressions on server-rendered elements.",
    demo: <ComposerDemo />
  }
]

const PlaygroundPage = (): JSX.Element => (
  <div
    class="min-h-dvh"
    data-signals={mod(
      { ...validationState.defaults, ...statusSearchState.defaults, ...composerState.defaults },
      { ifMissing: true }
    )}
  >
    <SiteHeader active="playground" />
    <main class="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 class="text-3xl font-semibold tracking-tight text-fg">Playground</h1>
      <p class="mt-3 max-w-xl text-fg-secondary">
        Three live interactions served by this Cloudflare Worker. Everything here is stateless on
        the server: the page you are reading is the entire application state.
      </p>
      <div class="mt-12 space-y-14">
        {demos.map((item) => (
          <section class="page-enter">
            <h2 class="text-lg font-semibold text-fg">{item.title}</h2>
            <p class="mt-2 max-w-xl text-sm leading-relaxed text-fg-secondary">{item.body}</p>
            <div class="mt-5 rounded-2xl border border-border bg-surface/50 p-5 sm:p-6">
              {item.demo}
            </div>
          </section>
        ))}
      </div>
      <p class="mt-14 border-t border-border-subtle pt-6 text-sm text-fg-muted">
        Want more? The repository ships{" "}
        <a
          href={`${GITHUB_URL}/tree/main/examples`}
          target="_blank"
          rel="noreferrer"
          class="font-medium text-fg-secondary underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
        >
          fourteen runnable examples
        </a>{" "}
        covering todos, realtime counters, modals, and a Linear-style issue tracker.
      </p>
    </main>
    <SiteFooter />
  </div>
)

export const registerPlaygroundPage = (app: App) => {
  app.get("/playground", () =>
    reply.page(<PlaygroundPage />, {
      title: "Playground · Datastar Kit",
      head: pageHead({
        description:
          "Live Datastar Kit interactions served by a stateless Cloudflare Worker: inline validation, active search, and browser-only signals.",
        path: "/playground"
      })
    })
  )

  registerValidationDemo(app)
  registerStatusSearchDemo(app)
}
