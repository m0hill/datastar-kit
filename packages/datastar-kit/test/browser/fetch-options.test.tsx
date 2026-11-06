import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { get, js, post } from "../../src/ds/index.js"
import { datastarAtLeast, mount, query } from "./datastar.js"

declare global {
  interface Window {
    stopRequest?: AbortController
  }
}

interface Sent {
  readonly url: string
  readonly signal: AbortSignal
}

// Datastar sends every action through the global `fetch`, so stubbing it simulates network
// failures and requests that never finish, while the real runtime reads the rendered options.
// These tests prove Datastar honors each option name and value the SDK renders.
const stubNetwork = (respond: () => Promise<Response>): Sent[] => {
  const sent: Sent[] = []
  vi.spyOn(window, "fetch").mockImplementation((input, init) => {
    const signal = init?.signal ?? new AbortController().signal
    const url = input instanceof Request ? input.url : input.toString()
    sent.push({ url, signal })
    return respond()
  })
  return sent
}

const networkFailure = (): Promise<Response> => Promise.reject(new TypeError("Failed to fetch"))

const neverResponds = (): Promise<Response> => new Promise<Response>(() => {})

// Resolves when Datastar reports that the action gave up retrying.
const retriesFailed = (): Promise<void> =>
  new Promise<void>((resolve) => {
    const onFetch = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail?.type !== "retries-failed") return
      document.removeEventListener("datastar-fetch", onFetch)
      resolve()
    }
    document.addEventListener("datastar-fetch", onFetch)
  })

const setPageHidden = (hidden: boolean): void => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event("visibilitychange"))
}

// Datastar 1.0.2 changed retryMaxCount from total attempts to retries after the first attempt.
const attemptsFor = (retryMaxCount: number): number =>
  datastarAtLeast("1.0.2") ? retryMaxCount + 1 : retryMaxCount

// Datastar rejects the action with a FetchFailed error once it stops retrying. That is the outcome
// these tests expect, so it must not surface as an unhandled rejection.
const ignoreFetchFailed = (event: PromiseRejectionEvent): void => {
  if (event.reason instanceof Error && event.reason.message.startsWith("FetchFailed")) {
    event.preventDefault()
  }
}

describe("Datastar fetch action options", () => {
  beforeEach(() => {
    window.addEventListener("unhandledrejection", ignoreFetchFailed)
  })

  afterEach(() => {
    window.removeEventListener("unhandledrejection", ignoreFetchFailed)
    window.stopRequest?.abort()
    delete window.stopRequest
    Reflect.deleteProperty(document, "hidden")
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it("stops retrying after retryMaxCount, waiting retryInterval capped at retryMaxWait", async () => {
    const sent = stubNetwork(networkFailure)
    // Uncapped, the second wait would be 5s and the test would time out.
    await mount(
      <button
        id="send"
        type="button"
        data-on:click={get("/unreachable", {
          retryInterval: 5,
          retryScaler: 1000,
          retryMaxWait: 10,
          retryMaxCount: 3
        })}
      />
    )
    const failed = retriesFailed()

    query("#send").click()

    await failed
    expect(sent).toHaveLength(attemptsFor(3))
  })

  it("multiplies the wait between retries by retryScaler", async () => {
    stubNetwork(networkFailure)
    // A zero scaler makes every retry after the first immediate. Datastar's default scaler of 2
    // would wait 300ms, then 600ms, so giving up would take at least 900ms.
    await mount(
      <button
        id="send"
        type="button"
        data-on:click={get("/unreachable", {
          retryInterval: 300,
          retryScaler: 0,
          retryMaxCount: 3
        })}
      />
    )
    const failed = retriesFailed()
    const started = performance.now()

    query("#send").click()

    await failed
    expect(performance.now() - started).toBeLessThan(700)
  })

  it("retries error responses when retry is error", async () => {
    // Datastar's default retry mode does not retry error responses at all.
    const sent = stubNetwork(async () => new Response("", { status: 500 }))
    window.stopRequest = new AbortController()
    await mount(
      <button
        id="send"
        type="button"
        data-on:click={get("/failing", {
          retry: "error",
          retryInterval: 5,
          retryMaxCount: 1,
          // Datastar before 1.0.2 ignores retryMaxCount for error responses, so stop it here.
          requestCancellation: js<AbortController>`window.stopRequest`
        })}
      />
    )

    query("#send").click()

    await expect.poll(() => sent.length).toBeGreaterThanOrEqual(2)
  })

  it("aborts the request through an app-provided AbortController", async () => {
    const sent = stubNetwork(neverResponds)
    window.stopRequest = new AbortController()
    await mount(
      <button
        id="send"
        type="button"
        data-on:click={post("/slow", {
          requestCancellation: js<AbortController>`window.stopRequest`
        })}
      />
    )

    query("#send").click()
    await expect.poll(() => sent.length).toBe(1)
    window.stopRequest.abort()

    expect(sent[0]?.signal.aborted).toBe(true)
  })

  it("cancels a repeated in-flight request unless requestCancellation is disabled", async () => {
    const sent = stubNetwork(neverResponds)
    await mount(
      <main>
        <button
          id="auto"
          type="button"
          data-on:click={post("/auto")}
        />
        <button
          id="disabled"
          type="button"
          data-on:click={post("/disabled", { requestCancellation: "disabled" })}
        />
      </main>
    )

    query("#auto").click()
    query("#auto").click()
    query("#disabled").click()
    query("#disabled").click()
    await expect.poll(() => sent.length).toBe(4)

    const aborted = (path: string) =>
      sent.filter((request) => request.url.includes(path)).map((request) => request.signal.aborted)
    expect(aborted("/auto")).toEqual([true, false])
    expect(aborted("/disabled")).toEqual([false, false])
  })

  it("keeps GET requests open while the page is hidden only with openWhenHidden", async () => {
    const sent = stubNetwork(neverResponds)
    await mount(
      <main>
        <button
          id="closes"
          type="button"
          data-on:click={get("/closes")}
        />
        <button
          id="stays-open"
          type="button"
          data-on:click={get("/stays-open", { openWhenHidden: true })}
        />
      </main>
    )

    query("#closes").click()
    query("#stays-open").click()
    await expect.poll(() => sent.length).toBe(2)
    setPageHidden(true)

    const [closes, staysOpen] = sent
    expect(closes?.signal.aborted).toBe(true)
    expect(staysOpen?.signal.aborted).toBe(false)
  })
})
