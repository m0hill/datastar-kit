import { reply, type HtmlChild } from "datastar-kit"
import type { ExampleModule, ExamplePageOptions } from "./types.js"
import { examples } from "./registry.js"

export const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const pageHead = (extra?: HtmlChild | readonly HtmlChild[]): readonly HtmlChild[] => [
  <meta name="viewport" content="width=device-width, initial-scale=1" />,
  <link rel="stylesheet" href="/public/styles.css" />,
  <script type="module" src={DATASTAR_RUNTIME} />,
  ...(extra === undefined ? [] : Array.isArray(extra) ? extra : [extra])
]

const Shell = (props: {
  readonly title: string
  readonly activeSlug?: string
  readonly children: HtmlChild | readonly HtmlChild[]
}) => (
  <main class="shell">
    <aside class="sidebar" aria-label="Examples">
      <a class="brand" href="/">
        Datastar Kit Examples
      </a>
      <nav>
        {examples.map((example) => (
          <a
            href={`/examples/${example.slug}`}
            aria-current={example.slug === props.activeSlug ? "page" : undefined}
          >
            {example.title}
          </a>
        ))}
      </nav>
    </aside>
    <section class="content" aria-labelledby="page-title">
      <header class="page-header">
        <div>
          <a class="back-link" href="/">
            Index
          </a>
          <h1 id="page-title">{props.title}</h1>
        </div>
      </header>
      {props.children}
    </section>
  </main>
)

export const indexPage = (): Response =>
  reply.page(
    <Shell title="Official Datastar Examples">
      <section class="panel">
        <p>This app implements all official Datastar examples using Datastar Kit.</p>
      </section>
    </Shell>,
    {
      title: "Official Datastar Examples",
      head: pageHead()
    }
  )

export const examplePage = (options: ExamplePageOptions): Response =>
  reply.page(
    <Shell title={options.title} activeSlug={options.slug}>
      <section class="intro">
        <p>{options.summary}</p>
        <a href={options.source} target="_blank" rel="noreferrer">
          Official example
        </a>
      </section>
      <section class="demo" aria-label={`${options.title} demo`}>
        {options.children}
      </section>
    </Shell>,
    {
      title: `${options.title} - Datastar Kit`,
      head: pageHead(options.head)
    }
  )

export const notImplementedPage = (example: ExampleModule): Response =>
  examplePage({
    title: example.title,
    slug: example.slug,
    summary: example.summary,
    source: example.source,
    children: <p>This example has not been implemented yet.</p>
  })
