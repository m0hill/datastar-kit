import { event, get, js, reply, unsafeHtml } from "datastar-kit"
import { pageHead, type App } from "../app"
import { snippets } from "../generated/docs"
import { Icons } from "../icons"
import { SiteFooter, SiteHeader } from "../layout"
import { DATASTAR_URL, GITHUB_URL } from "../nav"

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
    body: "Serve the first view as HTML from backend state."
  },
  {
    verb: "Listen",
    body: "Attach Datastar attributes to ordinary elements."
  },
  {
    verb: "Handle",
    body: "Decode signals and run normal TypeScript logic."
  },
  {
    verb: "Patch",
    body: "Return HTML or signals as native Response objects."
  }
] as const

const InstallCopyIcon = (props: { icon: "copy" | "check"; class?: string }) => {
  const Icon = Icons[props.icon]

  return (
    <span
      id="install-copy-icon"
      class={
        props.class ??
        "grid h-6 w-6 place-items-center text-fg-muted transition-colors group-hover:text-accent"
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
    Patched by the server
    {props.colo === "" ? "" : ` in ${props.colo}`} at{" "}
    <span class="font-mono text-accent">{props.time}</span>
  </p>
)

const Hero = () => (
  <section class="site-shell grid items-center gap-10 pt-12 pb-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(30rem,1.08fr)] lg:gap-16 lg:pt-16">
    <div class="page-enter max-w-2xl">
      <a
        href={DATASTAR_URL}
        target="_blank"
        rel="noreferrer"
        class="inline-flex items-center gap-2 text-fg-secondary transition-colors hover:text-accent"
      >
        <img
          src="/datastar-rocket.png"
          alt=""
          width={18}
          height={18}
          class="h-[18px] w-[18px]"
        />
        <span class="manual-kicker">Built for Datastar</span>
      </a>
      <h1 class="font-serif text-5xl leading-[0.95] font-medium tracking-tighter text-fg md:text-6xl lg:text-7xl">
        Server-rendered interfaces, patched like documents.
      </h1>
      <p class="mt-5 max-w-lg font-serif text-xl leading-relaxed text-fg-secondary">
        Typed Datastar attributes, TSX rendering, and Response helpers for server-driven UI.
      </p>
      <div class="mt-7 flex flex-wrap items-center gap-3">
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
      <button
        type="button"
        class="group mt-6 flex w-full max-w-sm cursor-pointer items-center justify-between gap-4 border border-border-strong bg-paper px-4 py-3 text-left font-mono text-sm text-fg transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent"
        data-on:click={js`navigator.clipboard.writeText(${"npm i datastar-kit"}); ${get("/demo/install-copy-feedback", { payload: {} })}`}
        aria-label="Copy npm install command"
      >
        <span>
          <span class="text-fg-muted">$ </span>
          npm i datastar-kit
        </span>
        <InstallCopyIcon icon="copy" />
      </button>
    </div>
    <div class="min-w-0 [&_.code-block]:my-0">{unsafeHtml(snippets["counter"] ?? "")}</div>
  </section>
)

const RuntimeSheet = () => (
  <section class="bg-paper/45 [&+section]:border-t-0">
    <div class="site-shell border-y border-border-subtle">
      <div class="grid gap-8 py-10 md:grid-cols-[15rem_minmax(0,1fr)] md:items-center">
        <div>
          <h2 class="font-serif text-2xl leading-tight font-medium tracking-tight text-fg">
            Runs where you do.
          </h2>
          <p class="mt-2 max-w-xs text-sm text-fg-secondary">Bring any Fetch-compatible runtime.</p>
        </div>
        <div class="flex flex-wrap items-center gap-x-10 gap-y-6 md:justify-end">
          {runtimes.map((runtime) => (
            <img
              src={`https://cdn.simpleicons.org/${runtime.slug}/47483e`}
              alt={runtime.name}
              title={runtime.name}
              width={28}
              height={28}
              class="h-7 w-7 opacity-75 transition-opacity hover:opacity-100"
            />
          ))}
        </div>
      </div>
    </div>
  </section>
)

const LoopSection = () => (
  <section class="site-shell py-24">
    <div class="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
      <div>
        <h2 class="font-serif text-4xl leading-tight font-medium tracking-tight text-fg md:text-5xl">
          One loop, owned by your server.
        </h2>
        <p class="mt-4 font-serif text-lg leading-relaxed text-fg-secondary">
          The browser handles events and patches. Your code keeps the application model.
        </p>
      </div>
      <ol class="grid gap-px overflow-hidden rounded-[3px] border border-border-subtle bg-border-subtle sm:grid-cols-2">
        {loop.map((step, i) => (
          <li class="bg-paper p-5">
            <p class="font-mono text-[11px] font-semibold tracking-wide text-accent">
              {String(i + 1).padStart(2, "0")} · {step.verb}
            </p>
            <p class="mt-3 font-serif text-lg text-fg">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
)

const LiveDemoSection = () => (
  <section class="bg-paper/60">
    <div class="site-shell border-y border-border-subtle py-24">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(22rem,0.55fr)] lg:items-center">
        <div>
          <p class="manual-kicker">Live patch</p>
          <h2 class="mt-3 font-serif text-4xl leading-tight font-medium tracking-tight text-fg md:text-5xl">
            This page is the demo.
          </h2>
          <p class="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-fg-secondary">
            Press the button and the server sends an HTML patch over SSE.
          </p>
        </div>
        <div class="blueprint-panel bg-surface p-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              class="btn-primary"
              data-on:click={get("/demo/ping")}
            >
              Run round trip
            </button>
            <span class="frame-label">GET /demo/ping</span>
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
    body: "data-on, data-bind, data-show, and friends are real TSX props."
  },
  {
    title: "Response helpers",
    body: "reply.page, reply.patch, reply.signals, reply.stream, and reply.navigate return native Responses."
  },
  {
    title: "Signals at the boundary",
    body: "read.signals(request) decodes Datastar payloads for your own validation layer."
  },
  {
    title: "A development debugger",
    body: "Drop one component into a page to inspect signals, patches, and SSE traffic."
  }
] as const

const BoxSection = () => (
  <section class="site-shell py-24">
    <div class="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:items-start">
      <div>
        <h2 class="font-serif text-4xl leading-tight font-medium tracking-tight text-fg md:text-5xl">
          A kit, not a framework.
        </h2>
        <p class="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-fg-secondary">
          Datastar Kit owns the Datastar-shaped pieces and nothing else. Everything works anywhere a
          Request becomes a Response.
        </p>
        <div class="mt-8 min-w-0 [&_.code-block]:my-0">{unsafeHtml(snippets["signals"] ?? "")}</div>
      </div>
      <dl class="border-t border-border-strong">
        {inTheBox.map((item) => (
          <div class="border-b border-border-subtle py-4">
            <dt class="font-mono text-[11px] font-semibold tracking-wide uppercase text-accent">
              {item.title}
            </dt>
            <dd class="mt-1.5 text-sm leading-relaxed text-fg-secondary">{item.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
)

const ClosingSection = () => (
  <section>
    <div class="site-shell border-t border-border-subtle py-24 text-center">
      <div
        class="paper-rule mx-auto mb-10 max-w-xl"
        aria-hidden="true"
      />
      <h2 class="mx-auto max-w-xl font-serif text-4xl leading-tight font-medium tracking-tight text-fg md:text-5xl">
        Readable in an afternoon.
      </h2>
      <p class="mx-auto mt-4 max-w-xl font-serif text-lg leading-relaxed text-fg-secondary">
        Install it, read the introduction, and ship one server-driven page.
      </p>
      <div class="mt-8">
        <a
          href="/introduction"
          class="btn-secondary"
        >
          Open docs
        </a>
      </div>
    </div>
  </section>
)

const HomePage = () => (
  <div class="min-h-dvh">
    <SiteHeader />
    <main>
      <Hero />
      <RuntimeSheet />
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
            class="grid h-6 w-6 place-items-center text-accent"
          />
        )
        await new Promise((resolve) => setTimeout(resolve, 1200))
        yield event.patch(<InstallCopyIcon icon="copy" />)
      })()
    )
  )
}
