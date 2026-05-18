import { describe, expect, it } from "vitest"
import { makeTodoSync, startTodoSyncServer, todoListNode, todoPageNode } from "../examples/todo-sync.js"
import { render } from "../src/html.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"
const TAILWIND_CDN = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"

const decoder = new TextDecoder()

const jsonRequest = (url: string, body: unknown): Request =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  })

describe("Hono todo sync example", () => {
  it("renders the Tailwind/Datastar TSX page", async () => {
    const todoSync = makeTodoSync()

    try {
      const response = await todoSync.handle(new Request("http://localhost/"))
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(html).toContain("<!doctype html>")
      expect(html).toContain(`src="${DATASTAR_CDN}"`)
      expect(html).toContain(`src="${TAILWIND_CDN}"`)
      expect(html).toContain("--color-clifford: #da373d")
      expect(html).toContain("Realtime todo sync")
      expect(html).toContain('data-init="@get(&quot;/todos/live&quot;)"')
      expect(html).toContain('data-on:submit__prevent="@post(&quot;/todos&quot;, {payload: {&quot;title&quot;: $title}})"')
    } finally {
      todoSync.shutdown()
    }
  })

  it("keeps todo fragments as composable JSX-rendered HTML nodes", () => {
    expect(render(todoPageNode())).toContain("Realtime todo sync")
    expect(render(todoListNode([{ id: crypto.randomUUID(), title: "Review TSX", completed: false, createdAt: new Date().toISOString() }]))).toContain("Review TSX")
  })

  it("validates create requests with Zod and patches validation errors", async () => {
    const todoSync = makeTodoSync()

    try {
      const response = await todoSync.handle(jsonRequest("http://localhost/todos", { title: "   " }))
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toBe("text/event-stream")
      expect(body).toContain("Add a todo first")
      expect(todoSync.currentTodos()).toHaveLength(0)
    } finally {
      todoSync.shutdown()
    }
  })

  it("syncs create, toggle, and delete changes to live SSE subscribers", async () => {
    const todoSync = makeTodoSync()

    try {
      const firstReader = (await todoSync.handle(new Request("http://localhost/todos/live"))).body!.getReader()
      const secondReader = (await todoSync.handle(new Request("http://localhost/todos/live"))).body!.getReader()

      expect(decoder.decode((await firstReader.read()).value)).toContain("No todos yet")
      expect(decoder.decode((await secondReader.read()).value)).toContain("No todos yet")

      const firstCreated = firstReader.read()
      const secondCreated = secondReader.read()
      const create = await todoSync.handle(jsonRequest("http://localhost/todos", { title: "Ship realtime todos" }))
      expect(create.status).toBe(200)
      expect(await create.text()).toContain('data: signals {"title":""}')
      expect(todoSync.currentTodos()).toHaveLength(1)

      const todo = todoSync.currentTodos()[0]!
      expect(decoder.decode((await firstCreated).value)).toContain("Ship realtime todos")
      expect(decoder.decode((await secondCreated).value)).toContain("Ship realtime todos")

      const toggled = firstReader.read()
      const toggle = await todoSync.handle(new Request(`http://localhost/todos/${todo.id}/toggle`, { method: "POST" }))
      expect(toggle.status).toBe(204)
      expect(todoSync.currentTodos()[0]?.completed).toBe(true)
      expect(decoder.decode((await toggled).value)).toContain("line-through")

      const deleted = firstReader.read()
      const remove = await todoSync.handle(new Request(`http://localhost/todos/${todo.id}`, { method: "DELETE" }))
      expect(remove.status).toBe(204)
      expect(todoSync.currentTodos()).toHaveLength(0)
      expect(decoder.decode((await deleted).value)).toContain("No todos yet")

      await firstReader.cancel()
      await secondReader.cancel()
    } finally {
      todoSync.shutdown()
    }
  })

  it("uses Hono compression for normal HTML and leaves SSE uncompressed", async () => {
    const todoSync = makeTodoSync()

    try {
      const page = await todoSync.handle(new Request("http://localhost/", { headers: { "accept-encoding": "gzip" } }))
      const live = await todoSync.handle(new Request("http://localhost/todos/live", { headers: { "accept-encoding": "gzip" } }))
      const reader = live.body!.getReader()

      expect(page.headers.get("content-encoding")).toBe("gzip")
      expect(live.headers.get("content-encoding")).toBeNull()
      await reader.cancel()
    } finally {
      todoSync.shutdown()
    }
  })

  it("can run as a standalone Hono Node server", async () => {
    const running = await startTodoSyncServer({ port: 0 })
    const address = running.server.address()

    try {
      expect(typeof address).toBe("object")
      expect(address).not.toBeNull()
      const port = typeof address === "object" && address !== null ? address.port : 0
      const response = await fetch(`http://127.0.0.1:${port}/`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("Realtime todo sync")
    } finally {
      await running.close()
    }
  })
})
