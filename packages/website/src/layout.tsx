import { mod, unsafeHtml } from "datastar-kit"
import type { DocPage } from "./doc-types"
import { Icons } from "./icons"
import { DATASTAR_URL, GITHUB_URL, flatNav, sidebar } from "./nav"
import { DocSearch, searchState } from "./search"

const HeaderLink = (props: { href: string; label: string; active: boolean }) => (
  <a
    href={props.href}
    class={
      props.active
        ? "border-b border-accent pb-1 font-mono text-[11px] font-semibold uppercase text-accent"
        : "border-b border-transparent pb-1 font-mono text-[11px] font-semibold uppercase text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
    }
  >
    {props.label}
  </a>
)

export const SiteHeader = (props: { active?: "docs" | "playground"; search?: boolean }) => (
  <header class="sticky top-0 z-40 border-b border-border-subtle bg-bg/92 backdrop-blur">
    <div class="site-shell">
      <div class="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-3 py-3 sm:gap-x-6 md:h-16 md:flex-nowrap md:py-0">
        <a
          href="/"
          class="flex items-center gap-2 border-b border-transparent pb-1 text-fg"
          aria-label="Datastar Kit home"
        >
          <span class="wordmark">Datastar Kit</span>
        </a>
        <nav class="flex items-center gap-4 sm:gap-5">
          <HeaderLink
            href="/introduction"
            label="Docs"
            active={props.active === "docs"}
          />
          <HeaderLink
            href="/playground"
            label="Playground"
            active={props.active === "playground"}
          />
        </nav>
        {props.search === true ? (
          <div class="order-3 w-full md:order-0 md:ml-auto md:w-72">
            <DocSearch />
          </div>
        ) : null}
        <div
          class={
            props.search === true
              ? "ml-auto flex items-center gap-4 md:ml-0"
              : "ml-auto flex items-center gap-4"
          }
        >
          <a
            href={DATASTAR_URL}
            target="_blank"
            rel="noreferrer"
            class="font-mono text-[11px] font-semibold uppercase text-fg-secondary transition-colors hover:text-accent max-sm:hidden"
          >
            Datastar
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            class="text-fg-secondary transition-colors hover:text-accent"
          >
            <Icons.gitHub
              aria-hidden="true"
              class="h-4 w-4 fill-current"
            />
          </a>
          <button
            type="button"
            aria-label="Toggle color theme"
            class="grid h-4 w-4 cursor-pointer place-items-center text-fg-secondary transition-colors hover:text-accent"
            data-on:click="const d = document.documentElement.classList.toggle('dark'); try { localStorage.setItem('theme', d ? 'dark' : 'light') } catch (e) {}"
          >
            <Icons.moon
              aria-hidden="true"
              class="h-4 w-4 dark:hidden"
            />
            <Icons.sun
              aria-hidden="true"
              class="hidden h-4 w-4 dark:block"
            />
          </button>
        </div>
      </div>
    </div>
  </header>
)

export const SiteFooter = () => (
  <footer class="border-t border-border-subtle bg-paper/45">
    <div class="site-shell py-8">
      <div
        class="paper-rule mb-6"
        aria-hidden="true"
      />
      <div class="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] uppercase text-fg-muted">
        <p class="inline-flex items-center gap-1.5">
          MIT licensed. Built for
          <img
            src="/datastar-rocket.png"
            alt=""
            width={14}
            height={14}
            class="h-3.5 w-3.5"
          />
          Datastar.
        </p>
        <nav class="flex items-center gap-4 sm:gap-5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            class="transition-colors hover:text-accent"
          >
            GitHub
          </a>
          <a
            href={DATASTAR_URL}
            target="_blank"
            rel="noreferrer"
            class="transition-colors hover:text-accent"
          >
            Datastar
          </a>
        </nav>
      </div>
    </div>
  </footer>
)

const SidebarNav = (props: { activePath: string }) => (
  <nav class="space-y-7">
    {sidebar.map((group) => (
      <div>
        <p class="frame-label mb-3 text-fg">{group.text}</p>
        <ul class="border-l border-border-subtle">
          {group.items.map((item) => (
            <li>
              <a
                href={item.path}
                class={
                  item.path === props.activePath
                    ? "-ml-px block border-l border-accent bg-accent-dim/40 py-1.5 pr-2 pl-3.5 font-mono text-[12px] font-semibold text-accent"
                    : "-ml-px block border-l border-transparent py-1.5 pr-2 pl-3.5 font-mono text-[12px] text-fg-secondary transition-colors hover:border-accent hover:text-fg"
                }
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
)

const PrevNextNav = (props: { activePath: string }) => {
  const index = flatNav.findIndex((item) => item.path === props.activePath)
  if (index === -1) {
    return null
  }
  const prev = index > 0 ? flatNav[index - 1] : undefined
  const next = index < flatNav.length - 1 ? flatNav[index + 1] : undefined
  return (
    <nav class="mt-16 grid gap-3 border-t border-border-strong pt-6 sm:grid-cols-2">
      {prev === undefined ? (
        <span />
      ) : (
        <a
          href={prev.path}
          class="group border border-border-subtle bg-paper px-4 py-3 transition-colors hover:border-accent"
        >
          <span class="frame-label">Previous</span>
          <span class="mt-1 block text-sm font-medium text-fg-secondary transition-colors group-hover:text-accent">
            {prev.text}
          </span>
        </a>
      )}
      {next === undefined ? (
        <span />
      ) : (
        <a
          href={next.path}
          class="group border border-border-subtle bg-paper px-4 py-3 text-right transition-colors hover:border-accent"
        >
          <span class="frame-label">Next</span>
          <span class="mt-1 block text-sm font-medium text-fg-secondary transition-colors group-hover:text-accent">
            {next.text}
          </span>
        </a>
      )}
    </nav>
  )
}

const OnThisPage = (props: { page: DocPage }) => {
  if (props.page.headings.length === 0) {
    return null
  }
  return (
    <nav class="text-[13px]">
      <p class="frame-label mb-3 text-fg">On this page</p>
      <ul class="border-l border-border-subtle">
        {props.page.headings.map((heading) => (
          <li>
            <a
              href={`#${heading.slug}`}
              class={
                heading.level === 2
                  ? "block py-1 pl-3.5 text-fg-secondary transition-colors hover:text-accent"
                  : "block py-1 pl-6 text-fg-muted transition-colors hover:text-accent"
              }
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export const DocsLayout = (props: { page: DocPage }) => (
  <div
    class="min-h-dvh"
    data-signals={mod(searchState.defaults, { ifMissing: true })}
  >
    <SiteHeader
      active="docs"
      search
    />
    <div class="site-shell lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
      <aside class="max-lg:hidden">
        <div class="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto border-r border-border-subtle py-10 pr-6">
          <SidebarNav activePath={props.page.path} />
        </div>
      </aside>
      <div class="min-w-0 py-10 lg:px-10">
        <details class="mb-6 border border-border-subtle bg-paper lg:hidden">
          <summary class="cursor-pointer px-4 py-3 font-mono text-xs font-semibold uppercase text-fg-secondary">
            All pages
          </summary>
          <div class="border-t border-border-subtle px-4 py-4">
            <SidebarNav activePath={props.page.path} />
          </div>
        </details>
        <article class="doc mx-auto max-w-3xl">{unsafeHtml(props.page.html)}</article>
        <div class="mx-auto max-w-3xl">
          <PrevNextNav activePath={props.page.path} />
        </div>
      </div>
      <aside class="max-xl:hidden">
        <div class="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto py-10 pl-6">
          <OnThisPage page={props.page} />
        </div>
      </aside>
    </div>
    <SiteFooter />
  </div>
)
