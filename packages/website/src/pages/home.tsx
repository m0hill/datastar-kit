import { event, get, js, reply, unsafeHtml } from "datastar-kit"
import { pageHead, type App } from "../app"
import { snippets } from "../generated/docs"
import { Icons } from "../icons"
import { SiteFooter, SiteHeader } from "../layout"
import { GITHUB_URL } from "../nav"

const runtimes = [
  { slug: "hono", name: "Hono" },
  { slug: "cloudflare", name: "Cloudflare Workers" },
  { slug: "bun", name: "Bun" },
  { slug: "deno", name: "Deno" },
  { slug: "nodedotjs", name: "Node.js" }
] as const

const loop = [
  {
    verb: "Render",
    body: "Serve the first page as plain HTML from backend state. No hydration, no client router."
  },
  {
    verb: "Listen",
    body: "Put typed Datastar attributes on elements. Browser events become ordinary HTTP requests."
  },
  {
    verb: "Handle",
    body: "Decode signals at the request boundary, run your logic, talk to your own data layer."
  },
  {
    verb: "Patch",
    body: "Return HTML or signal patches as native Responses. Datastar updates the DOM."
  }
] as const

const InstallCopyIcon = (props: { icon: "copy" | "check"; class?: string }) => {
  const Icon = Icons[props.icon]

  return (
    <span
      id="install-copy-icon"
      class={
        props.class ??
        "grid h-6 w-6 place-items-center rounded-md text-fg-muted transition-colors group-hover:text-fg"
      }
    >
      <Icon
        aria-hidden="true"
        class="h-4 w-4"
      />
    </span>
  )
}

const PingResult = () => (
  <p
    id="ping-result"
    class="text-sm text-fg-muted"
  >
    Waiting for a click.
  </p>
)

const PingResultPatched = (props: { colo: string; time: string }) => (
  <p
    id="ping-result"
    class="text-sm text-fg"
  >
    Patched by the worker
    {props.colo === "" ? "" : ` in ${props.colo}`} at{" "}
    <span class="font-mono text-accent-bright">{props.time}</span>
  </p>
)

const Hero = () => (
  <section class="mx-auto grid max-w-350 items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[5fr_4fr] lg:gap-16 lg:pt-24">
    <div class="page-enter">
      <h1 class="text-4xl font-semibold tracking-tighter text-fg md:text-5xl lg:text-6xl">
        Server-driven UI
        <br />
        for TypeScript.
      </h1>
      <p class="mt-5 max-w-md text-base leading-relaxed text-fg-secondary">
        Typed Datastar attributes, server-rendered TSX, and native Response helpers. Bring your own
        router, database, and runtime.
      </p>
      <button
        type="button"
        class="group mt-7 flex w-full max-w-xs cursor-pointer items-center justify-between gap-4 rounded-xl border border-border-subtle bg-code px-5 py-3.5 text-left font-mono text-sm text-fg transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-strong/50 focus-visible:outline-none"
        data-on:click={js`navigator.clipboard.writeText(${"npm i datastar-kit"}); ${get("/demo/install-copy-feedback", { payload: {} })}`}
        aria-label="Copy npm install command"
      >
        <span>
          <span class="text-fg-muted">$ </span>
          npm i datastar-kit
        </span>
        <InstallCopyIcon icon="copy" />
      </button>
      <div class="mt-8 flex flex-wrap items-center gap-3">
        <a
          href="/introduction"
          class="btn-primary"
        >
          Get started
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          class="btn-secondary"
        >
          View on GitHub
        </a>
      </div>
    </div>
    <div class="min-w-0 [&_.code-block]:my-0">{unsafeHtml(snippets["counter"] ?? "")}</div>
  </section>
)

const RuntimeStrip = () => (
  <section class="border-y border-border-subtle">
    <div class="mx-auto flex max-w-350 flex-wrap items-center justify-center gap-x-12 gap-y-6 px-4 py-10 sm:px-6">
      {runtimes.map((runtime) => (
        <img
          src={`https://cdn.simpleicons.org/${runtime.slug}/8f8f8f`}
          alt={runtime.name}
          title={runtime.name}
          width={28}
          height={28}
          class="h-7 w-7 opacity-70"
        />
      ))}
    </div>
  </section>
)

const LoopSection = () => (
  <section class="mx-auto max-w-350 px-4 py-24 sm:px-6">
    <h2 class="max-w-xl text-3xl font-semibold tracking-tight text-fg">
      One loop, owned by your server.
    </h2>
    <div class="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {loop.map((step) => (
        <div class="border-t border-border pt-5">
          <h3 class="font-mono text-sm font-semibold text-accent-bright">{step.verb}</h3>
          <p class="mt-2 text-sm leading-relaxed text-fg-secondary">{step.body}</p>
        </div>
      ))}
    </div>
  </section>
)

const LiveDemoSection = () => (
  <section class="border-y border-border-subtle bg-surface/40">
    <div class="mx-auto max-w-350 px-4 py-24 sm:px-6">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-semibold tracking-tight text-fg">This page is the demo.</h2>
        <p class="mt-4 text-fg-secondary">
          You are looking at a Cloudflare Worker rendering TSX with Datastar Kit. Press the button
          and the worker patches this page over SSE.
        </p>
        <div class="mx-auto mt-8 max-w-lg rounded-2xl border border-border bg-bg p-6 text-left shadow-2xl shadow-black/40">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              class="btn-primary"
              data-on:click={get("/demo/ping")}
            >
              Run a round trip
            </button>
            <span class="text-accent">
              <Icons.logo
                aria-hidden="true"
                class="h-5 w-5"
              />
            </span>
          </div>
          <div class="mt-5 border-t border-border-subtle pt-5">
            <PingResult />
          </div>
        </div>
      </div>
    </div>
  </section>
)

const inTheBox = [
  {
    title: "Typed attributes and actions",
    body: "data-on, data-bind, data-show, and friends are real TSX props. post() and get() build Datastar actions with typed modifiers."
  },
  {
    title: "Response helpers",
    body: "reply.page, reply.patch, reply.signals, reply.stream, and reply.navigate return plain native Responses."
  },
  {
    title: "Signals at the boundary",
    body: "read.signals(request) decodes Datastar payloads so you can validate them with your own schema library."
  },
  {
    title: "A development debugger",
    body: "Drop one component into a page to inspect signals, patches, and SSE traffic while you build."
  }
] as const

const BoxSection = () => (
  <section class="mx-auto max-w-350 px-4 py-24 sm:px-6">
    <h2 class="max-w-xl text-3xl font-semibold tracking-tight text-fg">A kit, not a framework.</h2>
    <p class="mt-4 max-w-xl text-fg-secondary">
      Datastar Kit owns the Datastar-shaped pieces and nothing else. Everything works anywhere a
      Request becomes a Response.
    </p>
    <div class="mt-12 grid gap-5 lg:grid-cols-5">
      <div class="min-w-0 lg:col-span-3 [&_.code-block]:my-0">
        {unsafeHtml(snippets["signals"] ?? "")}
      </div>
      <div class="grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1 lg:grid-rows-4">
        {inTheBox.map((item) => (
          <div class="rounded-2xl border border-border-subtle p-5 transition-colors hover:border-border">
            <h3 class="text-sm font-semibold text-fg">{item.title}</h3>
            <p class="mt-1.5 text-[13px] leading-relaxed text-fg-secondary">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

const ClosingSection = () => (
  <section class="relative overflow-hidden border-t border-border-subtle">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 max-w-3xl rounded-full bg-accent/10 blur-3xl"
    />
    <div class="relative mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h2 class="text-3xl font-semibold tracking-tight text-fg">Readable in an afternoon.</h2>
      <p class="mt-4 text-fg-secondary">
        The whole SDK is a handful of modules over Web Standards. Install it, read the introduction,
        and ship a page.
      </p>
    </div>
  </section>
)

const HomePage = () => (
  <div class="min-h-dvh">
    <SiteHeader />
    <main>
      <Hero />
      <RuntimeStrip />
      <LoopSection />
      <LiveDemoSection />
      <BoxSection />
      <ClosingSection />
    </main>
    <SiteFooter />
  </div>
)

export const registerHomePage = (app: App) => {
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

  app.get("/demo/ping", (c) => {
    const colo = c.req.raw.cf?.colo
    const time = `${new Date().toISOString().slice(11, 19)} UTC`
    return reply.patch(
      <PingResultPatched
        colo={typeof colo === "string" ? colo : ""}
        time={time}
      />
    )
  })

  app.get("/demo/install-copy-feedback", () =>
    reply.stream(
      (async function* () {
        yield event.patch(
          <InstallCopyIcon
            icon="check"
            class="grid h-6 w-6 place-items-center rounded-md text-accent-bright"
          />
        )
        await new Promise((resolve) => setTimeout(resolve, 1200))
        yield event.patch(<InstallCopyIcon icon="copy" />)
      })()
    )
  )
}
