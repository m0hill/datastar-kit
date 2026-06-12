import { mod, unsafeHtml } from "datastar-kit"
import type { DocPage } from "./doc-types"
import { DATASTAR_URL, GITHUB_URL, flatNav, sidebar } from "./nav"
import { DocSearch, searchState } from "./search"

export const Logo = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    class={props.class ?? "h-4 w-4"}
  >
    <path
      fill="currentColor"
      d="M12 1.5 14.7 9.3 22.5 12 14.7 14.7 12 22.5 9.3 14.7 1.5 12 9.3 9.3Z"
    />
  </svg>
)

const GithubIcon = () => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden="true"
    class="h-4 w-4 fill-current"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
)

const HeaderLink = (props: { href: string; label: string; active: boolean }) => (
  <a
    href={props.href}
    class={
      props.active
        ? "text-sm font-medium text-fg"
        : "text-sm font-medium text-fg-secondary transition-colors hover:text-fg"
    }
  >
    {props.label}
  </a>
)

export const SiteHeader = (props: { active?: "docs" | "playground"; search?: boolean }) => (
  <header class="sticky top-0 z-40 border-b border-border-subtle bg-bg/85 backdrop-blur">
    <div class="mx-auto flex min-h-14 max-w-350 flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 md:h-14 md:flex-nowrap md:py-0">
      <a
        href="/"
        class="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg"
      >
        <span class="text-accent">
          <Logo />
        </span>
        Datastar Kit
      </a>
      <nav class="flex items-center gap-5 max-md:gap-4">
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
        <div class="order-3 w-full md:order-0 md:ml-auto md:w-64">
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
          class="text-sm font-medium text-fg-secondary transition-colors hover:text-fg max-sm:hidden"
        >
          Datastar
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
          class="text-fg-secondary transition-colors hover:text-fg"
        >
          <GithubIcon />
        </a>
      </div>
    </div>
  </header>
)

export const SiteFooter = () => (
  <footer class="border-t border-border-subtle">
    <div class="mx-auto flex max-w-350 flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-fg-muted sm:px-6">
      <p>MIT licensed. Built with Datastar Kit on Cloudflare Workers.</p>
      <nav class="flex items-center gap-5">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          class="transition-colors hover:text-fg"
        >
          GitHub
        </a>
        <a
          href={DATASTAR_URL}
          target="_blank"
          rel="noreferrer"
          class="transition-colors hover:text-fg"
        >
          Datastar
        </a>
      </nav>
    </div>
  </footer>
)

const SidebarNav = (props: { activePath: string }) => (
  <nav class="space-y-7">
    {sidebar.map((group) => (
      <div>
        <p class="mb-2 text-xs font-semibold text-fg">{group.text}</p>
        <ul class="space-y-0.5 border-l border-border-subtle">
          {group.items.map((item) => (
            <li>
              <a
                href={item.path}
                class={
                  item.path === props.activePath
                    ? "-ml-px block border-l border-accent py-1 pl-3.5 text-[13.5px] font-medium text-fg"
                    : "-ml-px block border-l border-transparent py-1 pl-3.5 text-[13.5px] text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
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
    <nav class="mt-14 grid gap-3 border-t border-border-subtle pt-6 sm:grid-cols-2">
      {prev === undefined ? (
        <span />
      ) : (
        <a
          href={prev.path}
          class="group rounded-xl border border-border-subtle px-4 py-3 transition-colors hover:border-border-strong"
        >
          <span class="text-xs text-fg-muted">Previous</span>
          <span class="block text-sm font-medium text-fg-secondary transition-colors group-hover:text-fg">
            {prev.text}
          </span>
        </a>
      )}
      {next === undefined ? (
        <span />
      ) : (
        <a
          href={next.path}
          class="group rounded-xl border border-border-subtle px-4 py-3 text-right transition-colors hover:border-border-strong"
        >
          <span class="text-xs text-fg-muted">Next</span>
          <span class="block text-sm font-medium text-fg-secondary transition-colors group-hover:text-fg">
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
      <p class="mb-2 text-xs font-semibold text-fg">On this page</p>
      <ul class="space-y-1 border-l border-border-subtle">
        {props.page.headings.map((heading) => (
          <li>
            <a
              href={`#${heading.slug}`}
              class={
                heading.level === 2
                  ? "block py-0.5 pl-3.5 text-fg-secondary transition-colors hover:text-fg"
                  : "block py-0.5 pl-6 text-fg-muted transition-colors hover:text-fg"
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
    <div class="mx-auto max-w-350 px-4 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
      <aside class="max-lg:hidden">
        <div class="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-10 pr-6">
          <SidebarNav activePath={props.page.path} />
        </div>
      </aside>
      <div class="min-w-0 py-10 lg:px-10">
        <details class="mb-6 rounded-xl border border-border-subtle lg:hidden">
          <summary class="cursor-pointer px-4 py-3 text-sm font-medium text-fg-secondary">
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
        <div class="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-10 pl-2">
          <OnThisPage page={props.page} />
        </div>
      </aside>
    </div>
    <SiteFooter />
  </div>
)
