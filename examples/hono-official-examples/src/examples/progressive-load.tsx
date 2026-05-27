import { ds, event, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { sleep } from "../helpers.js"
import type { ExampleModule } from "../types.js"

const PlaceholderContent = () => (
  <div id="progressive-load-content" class="progressive-content">
    <header id="progressive-header" class="placeholder">Header waits for the stream.</header>
    <section id="progressive-article" class="placeholder">Article shell waits for the stream.</section>
    <section id="progressive-comments" class="placeholder">Comments wait for the stream.</section>
    <footer id="progressive-footer" class="placeholder">Footer waits for the stream.</footer>
  </div>
)

const LoadedHeader = () => <header id="progressive-header">Welcome to my blog</header>

const LoadedArticle = () => (
  <section id="progressive-article">
    <h2>This is my article</h2>
    <section id="progressive-article-body">
      <p>
        Each part is loaded randomly and progressively, showing that Datastar streams can update
        independent regions as soon as each result is available.
      </p>
    </section>
  </section>
)

const LoadedComments = () => (
  <section id="progressive-comments">
    <h3>Comments</h3>
    <ul class="comments-list">
      {["Ada Lovelace", "Grace Hopper", "Katherine Johnson"].map((name) => (
        <li>
          <img
            src={`https://avatar.iran.liara.run/username?username=${encodeURIComponent(name)}`}
            alt=""
          />
          <span>{name} liked the progressive load.</span>
        </li>
      ))}
    </ul>
  </section>
)

const LoadedFooter = () => <footer id="progressive-footer">Hope you like it.</footer>

export const progressiveLoadExample: ExampleModule = {
  slug: "progressive_load",
  title: "Progressive Load",
  summary: "Streams independent page sections as they become available.",
  source: "https://data-star.dev/examples/progressive_load",
  register(app) {
    app.get("/examples/progressive_load", () =>
      examplePage({
        title: "Progressive Load",
        slug: "progressive_load",
        summary: this.summary,
        source: this.source,
        children: (
          <div class="stack">
            <div class="actions">
              <button
                id="load-button"
                class="info"
                {...ds.dataSignal("loadDisabled", false)}
                {...ds.indicator("progressiveLoad")}
                {...ds.dataAttr("disabled", ds.expr("$loadDisabled"))}
                {...ds.on(
                  "click",
                  ds.expr("$loadDisabled = true; @get('/examples/progressive_load/updates')")
                )}
              >
                Load
              </button>
              <span class="muted" {...ds.show(ds.expr("$progressiveLoad"))}>
                Loading sections...
              </span>
            </div>
            <p>Each part is loaded randomly and progressively.</p>
            <PlaceholderContent />
          </div>
        )
      })
    )

    app.get("/examples/progressive_load/updates", () =>
      reply.stream(
        (async function* () {
          yield event.patch(<PlaceholderContent />)
          await sleep(250)
          yield event.patch(<LoadedHeader />)
          await sleep(350)
          yield event.patch(<LoadedArticle />)
          await sleep(300)
          yield event.patch(<LoadedComments />)
          await sleep(250)
          yield event.patch(<LoadedFooter />)
          yield event.signals({ loadDisabled: false })
        })()
      )
    )
  }
}
