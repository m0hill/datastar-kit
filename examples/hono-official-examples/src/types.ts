import type { Hono } from "hono"
import type { HtmlChild } from "datastar-kit"

export type App = Hono

export interface ExampleModule {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly source: string
  register(app: App): void
}

export interface ExamplePageOptions {
  readonly title: string
  readonly slug: string
  readonly summary: string
  readonly source: string
  readonly children: HtmlChild | readonly HtmlChild[]
  readonly head?: HtmlChild | readonly HtmlChild[]
}
