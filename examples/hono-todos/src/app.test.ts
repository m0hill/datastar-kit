import type { Hono } from "hono"
import { describe, expect, it, vi } from "vitest"
import { assertDatastarResponse, createDatastarFlightRecorder } from "datastar-kit/testing"

const request = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://test.local${path}`, init)

const datastarPost = (path: string, signals: unknown = {}): Request =>
  request(path, {
    method: "POST",
    headers: { "datastar-request": "true" },
    body: JSON.stringify(signals)
  })

const loadApp = async (): Promise<Hono> => {
  vi.resetModules()
  return (await import("./app.js")).app
}

const addTodo = async (app: Hono, title: string): Promise<Response> =>
  app.fetch(datastarPost("/todos", { title }))

describe("Hono todos", () => {
  it("renders the initial page as ordinary HTML", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("<h1>Hono todos</h1>")
    expect(html).toContain('data-on:submit__prevent="@post(&quot;/todos&quot;)"')
    expect(html).toContain('data-bind="title"')
    expect(html).toContain('<section id="todos" aria-label="Todos">')
    expect(html).toContain("No todos yet.")
  })

  it("records the add-todo Datastar request and semantic response patches", async () => {
    const app = await loadApp()
    const recorder = createDatastarFlightRecorder()
    const addTodoRequest = datastarPost("/todos", { title: "Write tests" })

    const response = await recorder.handle(addTodoRequest, (handlerRequest) =>
      app.fetch(handlerRequest)
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(response.headers.get("cache-control")).toBe("no-cache")
    const assertions = recorder.assert()
    assertions.toHaveRequested({
      method: "POST",
      url: /\/todos$/,
      signals: { title: "Write tests" }
    })
    assertions.toHavePatchedSignals({ title: "", errors: { title: "" } })
    assertions.toHavePatchedElements({
      elements: /<li id="todo-1" data-completed="false">[\s\S]*Write tests[\s\S]*1 of 1 remaining/
    })
    assertions.toHaveNoSignalErrors()
  })

  it("returns signal validation errors without raw SSE assertions", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/todos", { title: "   " }))

    expect(response.status).toBe(200)
    await assertDatastarResponse(response).toHavePatchedSignals({
      errors: { title: "Enter a todo title." }
    })
  })

  it("patches the todo list after toggling and deleting items", async () => {
    const app = await loadApp()
    await addTodo(app, "Write docs")

    const toggled = await app.fetch(datastarPost("/todos/1/toggle"))
    expect(toggled.status).toBe(200)
    await assertDatastarResponse(toggled).toHavePatchedElements({
      elements:
        /<li id="todo-1" data-completed="true">[\s\S]*<s>Write docs<\/s>[\s\S]*0 of 1 remaining/
    })

    const deleted = await app.fetch(datastarPost("/todos/1/delete"))
    expect(deleted.status).toBe(200)
    await assertDatastarResponse(deleted).toHavePatchedElements({
      elements: /<p id="empty-state">No todos yet\.<\/p>[\s\S]*0 of 0 remaining/
    })
  })

  it("uses normal HTTP assertions for routes outside the Datastar contract", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/todos/999/toggle"))

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe("Not Found")
  })
})
