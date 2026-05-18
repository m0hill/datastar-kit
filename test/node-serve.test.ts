import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { route, router, textResponse } from "../src/handler.js"
import { closeServer, serve, serverOrigin } from "../src/node.js"

describe("Node serve helper", () => {
  it("starts a node:http server for an Effect handler", async () => {
    const app = router(route("GET", "/", () => Effect.succeed(textResponse("served"))))
    const server = await Effect.runPromise(serve(app))

    try {
      const response = await fetch(serverOrigin(server))

      expect(response.status).toBe(200)
      expect(await response.text()).toBe("served")
    } finally {
      await Effect.runPromise(closeServer(server))
    }
  })

  it("supports custom host and ephemeral port options", async () => {
    const app = router(route("GET", "/", () => Effect.succeed(textResponse("ok"))))
    const server = await Effect.runPromise(serve(app, { host: "127.0.0.1", port: 0 }))

    try {
      expect(serverOrigin(server)).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    } finally {
      await Effect.runPromise(closeServer(server))
    }
  })

  it("runs environment-free handlers without requiring casts", async () => {
    const app = router(route("GET", "/typed", () => Effect.succeed(textResponse("typed"))))
    const server = await Effect.runPromise(serve(app))

    try {
      const response = await fetch(`${serverOrigin(server)}/typed`)

      expect(response.status).toBe(200)
      expect(await response.text()).toBe("typed")
    } finally {
      await Effect.runPromise(closeServer(server))
    }
  })
})
