import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { waitForAbortSignal, waitForRequestAbort } from "../src/request.js"

describe("request abort helpers", () => {
  it("completes when a request signal aborts", async () => {
    const controller = new AbortController()
    const request = new Request("http://localhost/live", { signal: controller.signal })
    const completed = Effect.runPromise(waitForRequestAbort(request).pipe(Effect.as("aborted")))

    controller.abort()

    await expect(completed).resolves.toBe("aborted")
  })

  it("completes immediately for already-aborted signals", async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(Effect.runPromise(waitForAbortSignal(controller.signal).pipe(Effect.as("aborted")))).resolves.toBe(
      "aborted"
    )
  })
})
