import { get, js, mod, post, state, type Expr } from "datastar-kit"
import type { JSX } from "datastar-kit/jsx-runtime"
import { z } from "zod"
import { SiteFooter, SiteHeader } from "../layout"
import { GITHUB_URL } from "../nav"

/* Demo 1: inline validation. The server owns the rules; signals carry the form. */

export const signupState = state({
  name: "",
  email: "",
  errors: { name: "", email: "" }
})

export const SignupSignals = z.object({
  name: z.string().optional().default(""),
  email: z.string().optional().default("")
})

export const SignupStatus = (props: { ok?: boolean }): JSX.Element => (
  <p
    id="signup-status"
    class={props.ok === true ? "text-sm text-fg" : "text-sm text-fg-muted"}
  >
    {props.ok === true
      ? "Valid. The worker accepted this submission."
      : "Submit the form and the worker validates it with Zod."}
  </p>
)

const FieldError = (props: { signal: Expr<string> }): JSX.Element => (
  <p
    class="mt-1.5 text-xs text-accent-bright"
    data-text={props.signal}
    data-show={js`${props.signal} !== ''`}
  />
)

const ValidationDemo = (): JSX.Element => (
  <form
    class="space-y-4"
    data-on:submit={mod(post("/playground/signup"), { prevent: true })}
  >
    <div>
      <label
        for="signup-name"
        class="mb-1.5 block text-sm font-medium text-fg"
      >
        Name
      </label>
      <input
        id="signup-name"
        class="field"
        placeholder="Ada Lovelace"
        data-bind={signupState.refs.name}
      />
      <FieldError signal={signupState.refs.errors.name} />
    </div>
    <div>
      <label
        for="signup-email"
        class="mb-1.5 block text-sm font-medium text-fg"
      >
        Email
      </label>
      <input
        id="signup-email"
        class="field"
        placeholder="ada@example.com"
        data-bind={signupState.refs.email}
      />
      <FieldError signal={signupState.refs.errors.email} />
    </div>
    <div class="flex items-center justify-between gap-4">
      <button
        type="submit"
        class="btn-primary"
      >
        Submit
      </button>
    </div>
    <div class="border-t border-border-subtle pt-4">
      <SignupStatus />
    </div>
  </form>
)

/* Demo 2: active search over a constant dataset. No storage, pure request/response. */

export interface StatusCode {
  readonly code: number
  readonly text: string
  readonly blurb: string
}

export const statusCodes: readonly StatusCode[] = [
  { code: 200, text: "OK", blurb: "The request succeeded." },
  { code: 201, text: "Created", blurb: "A new resource was created." },
  {
    code: 204,
    text: "No Content",
    blurb: "Success with an empty body. Datastar Kit uses it for reply.done()."
  },
  { code: 301, text: "Moved Permanently", blurb: "The resource has a new canonical URL." },
  { code: 302, text: "Found", blurb: "Temporary redirect to another URL." },
  { code: 304, text: "Not Modified", blurb: "The cached representation is still valid." },
  { code: 400, text: "Bad Request", blurb: "The server cannot process the malformed request." },
  { code: 401, text: "Unauthorized", blurb: "Authentication is required and has failed." },
  { code: 403, text: "Forbidden", blurb: "Authenticated, but not allowed." },
  { code: 404, text: "Not Found", blurb: "No resource lives at this URL." },
  { code: 409, text: "Conflict", blurb: "The request conflicts with the current state." },
  { code: 418, text: "I'm a teapot", blurb: "The server refuses to brew coffee in a teapot." },
  { code: 422, text: "Unprocessable Content", blurb: "Well-formed, but semantically invalid." },
  { code: 429, text: "Too Many Requests", blurb: "The client is being rate limited." },
  { code: 500, text: "Internal Server Error", blurb: "Something failed on the server." },
  { code: 503, text: "Service Unavailable", blurb: "The server is temporarily overloaded or down." }
]

export const statusState = state({ filter: "" })

export const StatusSignals = z.object({
  filter: z.string().optional().default("")
})

export const StatusList = (props: { items: readonly StatusCode[] }): JSX.Element => (
  <ul
    id="status-list"
    class="max-h-72 space-y-1 overflow-y-auto pr-1"
  >
    {props.items.length === 0 ? (
      <li class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
        No status codes match.
      </li>
    ) : (
      props.items.map((item) => (
        <li class="flex items-baseline gap-3 rounded-lg border border-border-subtle px-3.5 py-2.5">
          <span class="font-mono text-sm font-semibold text-accent-bright">{item.code}</span>
          <span class="text-sm font-medium text-fg">{item.text}</span>
          <span class="truncate text-xs text-fg-muted max-sm:hidden">{item.blurb}</span>
        </li>
      ))
    )}
  </ul>
)

const SearchDemo = (): JSX.Element => (
  <div class="space-y-4">
    <input
      type="search"
      class="field"
      placeholder="Filter by code or name, try 4 or teapot"
      aria-label="Filter status codes"
      data-bind={statusState.refs.filter}
      data-on:input={mod(get("/playground/status"), { debounce: "150ms" })}
    />
    <StatusList items={statusCodes} />
  </div>
)

/* Demo 3: browser-only signals. No request leaves the page. */

export const composerState = state({ note: "" })

const COMPOSER_LIMIT = 140

const ComposerDemo = (): JSX.Element => (
  <div class="space-y-3">
    <textarea
      class="field min-h-24 resize-y"
      placeholder="Draft a release note"
      aria-label="Draft a release note"
      data-bind={composerState.refs.note}
    />
    <div class="flex items-center justify-between text-xs">
      <span
        class="font-mono text-fg-muted"
        data-text={js`(${COMPOSER_LIMIT} - ${composerState.refs.note}.length) + ' characters left'`}
        data-class={{
          "text-accent-bright": js`${composerState.refs.note}.length > ${COMPOSER_LIMIT}`
        }}
      />
      <button
        type="button"
        class="btn-secondary px-3 py-1.5 text-xs"
        data-on:click={js`${composerState.refs.note} = ''`}
      >
        Clear
      </button>
    </div>
  </div>
)

/* Page */

interface Demo {
  readonly title: string
  readonly body: string
  readonly demo: JSX.Element
}

const demos: readonly Demo[] = [
  {
    title: "Inline validation",
    body: "Signals carry the form to the worker. Zod validates on the server, and error messages come back as signal patches. No client-side validation code exists on this page.",
    demo: <ValidationDemo />
  },
  {
    title: "Active search",
    body: "Each keystroke is debounced into a GET request. The worker filters a constant dataset and patches the list back as HTML. The browser holds no data and no templates.",
    demo: <SearchDemo />
  },
  {
    title: "Browser-only signals",
    body: "Not everything needs a round trip. These signals never leave the page: the character count and the clear button are plain Datastar expressions on server-rendered elements.",
    demo: <ComposerDemo />
  }
]

export const PlaygroundPage = (): JSX.Element => (
  <div
    class="min-h-dvh"
    data-signals={mod(
      { ...signupState.defaults, ...statusState.defaults, ...composerState.defaults },
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
