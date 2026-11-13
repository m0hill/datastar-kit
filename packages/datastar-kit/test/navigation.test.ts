import { describe, expect, it } from "vitest"
import * as event from "../src/event.js"
import type { NavigateOptions } from "../src/event.js"

const baseUrl = "https://app.example"

const target = (url: string | URL, options?: NavigateOptions): unknown => {
  const assigned = /window\.location\.href = (".*?") \}/.exec(event.navigate(url, options))?.[1]
  return assigned === undefined ? undefined : JSON.parse(assigned)
}

describe("event.navigate URL safety", () => {
  it("normalizes same-origin targets to a path with query and hash", () => {
    expect(target("/dashboard?tab=1#top", { baseUrl })).toBe("/dashboard?tab=1#top")
    expect(target("https://app.example/a/../b", { baseUrl })).toBe("/b")
    expect(target(new URL("https://app.example/settings"), { baseUrl })).toBe("/settings")
  })

  it("resolves relative targets against http://localhost by default", () => {
    expect(target("issues/1")).toBe("/issues/1")
    expect(() => target("https://app.example/")).toThrow(event.NavigationUrlError)
  })

  it.each([
    ["a cross-origin URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example/phish"],
    ["a backslash-prefixed URL", "/\\evil.example/phish"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/html,<script>alert(1)</script>"],
    ["a URL with an embedded tab", "java\tscript:alert(1)"],
    ["a URL with a line break", "/safe\nSet-Cookie: bad"]
  ])("rejects %s", (_label, url) => {
    expect(() => target(url, { baseUrl })).toThrow(event.NavigationUrlError)
  })

  it("allows absolute URLs only for explicitly allowed HTTP(S) origins", () => {
    expect(
      target("https://docs.example/start?x=1", {
        baseUrl,
        allowedOrigins: [new URL("https://docs.example/ignored-path")]
      })
    ).toBe("https://docs.example/start?x=1")
    expect(() =>
      target("http://docs.example/start", { baseUrl, allowedOrigins: ["https://docs.example"] })
    ).toThrow(event.NavigationUrlError)
  })

  it.each([
    ["a malformed origin", "not a url"],
    ["a non-HTTP origin", "ftp://docs.example"]
  ])("rejects %s in allowedOrigins instead of ignoring it", (_label, origin) => {
    expect(() => target("/home", { baseUrl, allowedOrigins: [origin] })).toThrow(
      `Invalid allowed navigation origin: ${JSON.stringify(origin)}`
    )
  })
})
