import { event, read, reply } from "datastar-kit"
import { Hono } from "hono"
import { z } from "zod"
import { docPages } from "./generated/docs"
import { DocsLayout, pageHead, SiteFooter, SiteHeader } from "./layout"
import { HomePage, PingResultPatched } from "./pages/home"
import {
  PlaygroundPage,
  SignupSignals,
  SignupStatus,
  signupState,
  statusCodes,
  StatusList,
  StatusSignals
} from "./pages/playground"
import { SearchResults, searchDocs } from "./search"

const app = new Hono()

app.get("/", () =>
  reply.page(<HomePage />, {
    title: "Datastar Kit · Server-driven UI for TypeScript",
    head: pageHead({
      description:
        "A small TypeScript SDK for building server-driven UI with Datastar: typed attributes, server-rendered TSX, and native Response helpers.",
      path: "/"
    })
  })
)

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

const SearchSignals = z.object({
  q: z.string().optional().default("")
})

const safeReadSignals = async <Schema extends z.ZodType>(
  schema: Schema,
  request: Request
): Promise<z.infer<Schema> | undefined> => {
  try {
    const result = schema.safeParse(await read.signals(request))
    return result.success ? result.data : undefined
  } catch {
    return undefined
  }
}

app.get("/search", async (c) => {
  const signals = await safeReadSignals(SearchSignals, c.req.raw)
  const query = signals?.q.trim() ?? ""
  if (query === "") {
    return reply.patch(<div id="search-results" />)
  }
  return reply.patch(
    <SearchResults
      query={query}
      hits={searchDocs(query)}
    />
  )
})

app.get("/demo/ping", (c) => {
  const cf = (c.req.raw as Request & { cf?: { colo?: string } }).cf
  const time = `${new Date().toISOString().slice(11, 19)} UTC`
  return reply.patch(
    <PingResultPatched
      colo={cf?.colo ?? ""}
      time={time}
    />
  )
})

app.post("/playground/signup", async (c) => {
  const signals = await safeReadSignals(SignupSignals, c.req.raw)
  if (signals === undefined) {
    return reply.stream([
      event.signals(signupState.patch({ errors: { name: "", email: "Submit the form again." } })),
      event.patch(<SignupStatus ok={false} />)
    ])
  }

  const errors = {
    name: signals.name.trim().length >= 2 ? "" : "Use at least 2 characters.",
    email: z.email().safeParse(signals.email.trim()).success ? "" : "Enter a valid email address."
  }
  const valid = errors.name === "" && errors.email === ""
  return reply.stream([
    event.signals(signupState.patch({ errors })),
    event.patch(<SignupStatus ok={valid} />)
  ])
})

app.get("/playground/status", async (c) => {
  const signals = await safeReadSignals(StatusSignals, c.req.raw)
  const filter = signals?.filter.trim().toLowerCase() ?? ""
  const items =
    filter === ""
      ? statusCodes
      : statusCodes.filter(
          (item) =>
            String(item.code).includes(filter) ||
            item.text.toLowerCase().includes(filter) ||
            item.blurb.toLowerCase().includes(filter)
        )
  return reply.patch(<StatusList items={items} />)
})

app.notFound(() =>
  reply.page(
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
    </div>,
    { title: "Not found · Datastar Kit", head: pageHead({}) },
    { status: 404 }
  )
)

export default app
