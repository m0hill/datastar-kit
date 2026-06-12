export interface NavLink {
  readonly text: string
  readonly path: string
}

export interface NavGroup {
  readonly text: string
  readonly items: readonly NavLink[]
}

export const GITHUB_URL = "https://github.com/m0hill/datastar-kit"
export const DATASTAR_URL = "https://data-star.dev/"

export const sidebar: readonly NavGroup[] = [
  {
    text: "Overview",
    items: [
      { text: "Introduction", path: "/introduction" },
      { text: "Docs map", path: "/docs" }
    ]
  },
  {
    text: "Concepts",
    items: [
      { text: "Programming model", path: "/concepts/programming-model" },
      { text: "Runtime boundaries", path: "/concepts/runtime-boundaries" }
    ]
  },
  {
    text: "Guides",
    items: [
      { text: "HTML and JSX", path: "/guides/html-and-jsx" },
      { text: "Signals", path: "/guides/signals" },
      { text: "Actions and responses", path: "/guides/actions-and-responses" },
      { text: "Element patches", path: "/guides/patch-elements" },
      { text: "Validation", path: "/guides/validation-and-errors" },
      { text: "Realtime", path: "/guides/realtime" },
      { text: "Debugger", path: "/guides/debugger" }
    ]
  },
  {
    text: "Operations",
    items: [
      { text: "Security", path: "/guides/security" },
      { text: "Deployment", path: "/guides/deployment" },
      { text: "Testing", path: "/guides/testing" }
    ]
  },
  {
    text: "Reference",
    items: [
      { text: "API", path: "/reference/api" },
      { text: "Examples", path: "/guides/examples" },
      { text: "Architecture", path: "/reference/architecture" },
      { text: "Agent setup", path: "/guides/agent" }
    ]
  }
]

export const flatNav: readonly NavLink[] = sidebar.flatMap((group) => group.items)
