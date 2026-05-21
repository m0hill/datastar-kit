import { defineConfig } from "vitepress"

export default defineConfig({
  title: "Datastar Kit",
  description: "Documentation for server-driven TypeScript UI with Web Standard Request and Response primitives.",
  cleanUrls: true,
  themeConfig: {
    siteTitle: "Datastar Kit",
    nav: [
      { text: "Guide", link: "/docs" },
      { text: "API", link: "/reference/api" },
      { text: "Datastar", link: "https://data-star.dev/" }
    ],
    sidebar: [
      {
        text: "Overview",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Documentation", link: "/docs" }
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
          { text: "Patch elements", link: "/guides/patch-elements" },
          { text: "Validation and errors", link: "/guides/validation-and-errors" },
          { text: "Realtime streams", link: "/guides/realtime" },
          { text: "Security", link: "/guides/security" },
          { text: "Deployment", link: "/guides/deployment" },
          { text: "Testing", link: "/guides/testing" },
          { text: "Examples", link: "/guides/examples" }
        ]
      },
      {
        text: "Reference",
        items: [
          { text: "API", link: "/reference/api" },
          { text: "Architecture", link: "/reference/architecture" }
        ]
      }
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/starfederation/datastar" }
    ],
    search: {
      provider: "local"
    }
  }
})
