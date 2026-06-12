import type { HtmlChild } from "datastar-kit"
import type { Hono } from "hono"

export type AppBindings = { Bindings: CloudflareBindings }
export type App = Hono<AppBindings>

const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#f6f6f1"/><text x="16" y="22" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="16" font-weight="700" letter-spacing="-1" text-anchor="middle" fill="#1b55ff">DK</text></svg>`
  )

export const pageHead = (options: { description?: string; path?: string }): HtmlChild[] => [
  <meta charset="utf-8" />,
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />,
  ...(options.description === undefined
    ? []
    : [
        <meta
          name="description"
          content={options.description}
        />
      ]),
  ...(options.path === undefined
    ? []
    : [
        <link
          rel="canonical"
          href={`https://datastar-kit.dev${options.path === "/" ? "" : options.path}`}
        />
      ]),
  <link
    rel="icon"
    href={FAVICON}
  />,
  <link
    rel="stylesheet"
    href="/styles.css"
  />,
  <script
    type="module"
    src={DATASTAR_RUNTIME}
  />
]
