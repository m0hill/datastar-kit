import { generateCookie, getCookie } from "hono/cookie"
import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

const cookieName = "counter_user_clicks"
const initialUserClicks = 0
let globalClicks = 0

const userClicks = (c: Parameters<typeof getCookie>[0]): number => {
  const value = Number(getCookie(c, cookieName) ?? initialUserClicks)
  return Number.isSafeInteger(value) && value >= 0 ? value : initialUserClicks
}

const GlobalButton = () => (
  <button id="global" class="info" {...ds.on("click", ds.patch("/examples/counters/global"))}>
    Increment Global: {globalClicks}
  </button>
)

const UserButton = ({ count }: { count: number }) => (
  <button id="user" class="success" {...ds.on("click", ds.patch("/examples/counters/user"))}>
    Increment User: {count}
  </button>
)

export const example = new Hono()

example.get("/", (c) =>
  reply.page(
    <ExampleLayout
      title="Templ Counter"
      slug="counters"
      summary="Shows a server-global counter streamed with SSE and a cookie-backed per-user counter."
      source="https://data-star.dev/examples/templ_counter"
    >
      <div class="actions" {...ds.init(ds.get("/examples/counters/updates"))}>
        <GlobalButton />
        <UserButton count={userClicks(c)} />
      </div>
    </ExampleLayout>,
    {
      title: "Templ Counter - Datastar Kit",
      head: pageHead()
    }
  )
)

example.patch("/global", () => {
  globalClicks += 1
  return new Response(null, { status: 204 })
})

example.patch("/user", (c) => {
  const next = userClicks(c) + 1

  return reply.directHtml(
    <UserButton count={next} />,
    {},
    {
      headers: {
        "set-cookie": generateCookie(cookieName, String(next), {
          path: "/examples/counters",
          maxAge: 60 * 60 * 24,
          sameSite: "Lax"
        })
      }
    }
  )
})

example.get("/updates", (c) => {
  async function* stream() {
    while (!c.req.raw.signal.aborted) {
      yield event.patch(<GlobalButton />)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return reply.stream(stream(), { heartbeat: { intervalMs: 15_000, comment: "counters" } })
})
