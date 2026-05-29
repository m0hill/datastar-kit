import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

const tabText = [
  "Sed laudantium non eum nobis facere. Est repudiandae consectetur debitis et libero.",
  "Fuga facilis id sapiente possimus minus. Dignissimos et iusto error deserunt officiis.",
  "Molestiae maiores aut natus est praesentium. Rerum ut quod voluptatem officiis.",
  "Quisquam ad qui consequuntur maiores. Ipsam beatae quasi dolore ducimus.",
  "Aut dolorem alias ea illum. Doloremque sunt rem quis recusandae.",
  "Iste omnis voluptatem in rerum. Voluptatum impedit consequatur distinctio.",
  "Doloribus nostrum vero quibusdam. Voluptatem velit quos veniam aspernatur."
]

const LazyTabs = ({ active }: { readonly active: number }) => (
  <div id="lazy-tabs-demo" class="stack">
    <div role="tablist" class="tabs">
      {tabText.map((_, index) => (
        <button
          role="tab"
          aria-selected={index === active ? "true" : "false"}
          class={index === active ? "info" : undefined}
          {...ds.on("click", ds.get(`/examples/lazy_tabs/${index}`))}
        >
          Tab {index}
        </button>
      ))}
    </div>
    <div role="tabpanel" class="tab-panel">
      <p>{tabText[active] ?? tabText[0]}</p>
      <p class="muted">This panel was rendered by the server for tab {active}.</p>
    </div>
  </div>
)

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Lazy Tabs"
      slug="lazy_tabs"
      summary="Fetches tab panel content only when a tab is selected."
      source="https://data-star.dev/examples/lazy_tabs"
    >
      <LazyTabs active={0} />
    </ExampleLayout>,
    {
      title: "Lazy Tabs - Datastar Kit",
      head: pageHead()
    }
  )
)

example.get("/:index", (c) => {
  const index = Math.max(0, Math.min(tabText.length - 1, Number(c.req.param("index"))))
  return reply.patch(<LazyTabs active={index} />)
})
