import { defineConfig } from "vitepress"

export default defineConfig({
  title: "Datastar Kit",
  description: "A small TypeScript SDK for server-driven Datastar UI.",
  cleanUrls: true,
  themeConfig: {
    siteTitle: "Datastar Kit",
    nav: [
      { text: "Docs", link: "/docs" },
      { text: "API", link: "/reference/api" },
      { text: "GitHub", link: "https://github.com/m0hill/datastar-kit" },
      { text: "Datastar", link: "https://data-star.dev/" }
    ],
    sidebar: [
      {
        text: "Overview",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Docs map", link: "/docs" }
        ]
      },
      {
        text: "Concepts",
        items: [
          { text: "Programming model", link: "/concepts/programming-model" },
          { text: "Runtime boundaries", link: "/concepts/runtime-boundaries" }
        ]
      },
      {
        text: "Guides",
        items: [
          { text: "HTML and JSX", link: "/guides/html-and-jsx" },
          { text: "Signals", link: "/guides/signals" },
          { text: "Actions and responses", link: "/guides/actions-and-responses" },
          { text: "Element patches", link: "/guides/patch-elements" },
          { text: "Validation", link: "/guides/validation-and-errors" },
          { text: "Realtime", link: "/guides/realtime" },
          { text: "Debugger", link: "/guides/debugger" }
        ]
      },
      {
        text: "Operations",
        items: [
          { text: "Security", link: "/guides/security" },
          { text: "Deployment", link: "/guides/deployment" },
          { text: "Testing", link: "/guides/testing" }
        ]
      },
      {
        text: "Reference",
        items: [
          { text: "API", link: "/reference/api" },
          { text: "Examples", link: "/guides/examples" },
          { text: "Architecture", link: "/reference/architecture" },
          { text: "Agent setup", link: "/guides/agent" }
        ]
      }
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/m0hill/datastar-kit" }],
    search: {
      provider: "local"
    }
  }
})
