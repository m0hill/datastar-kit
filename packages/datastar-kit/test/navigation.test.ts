import { describe, expect, it } from "vitest"
import { NavigationUrlError, safeNavigationUrl } from "../src/navigation.js"

const baseUrl = "https://app.example"

describe("safeNavigationUrl", () => {
  it("normalizes same-origin targets to a path with query and hash", () => {
    expect(safeNavigationUrl("/dashboard?tab=1#top", { baseUrl })).toBe("/dashboard?tab=1#top")
    expect(safeNavigationUrl("https://app.example/a/../b", { baseUrl })).toBe("/b")
    expect(safeNavigationUrl(new URL("https://app.example/settings"), { baseUrl })).toBe(
      "/settings"
    )
  })

  it("resolves relative targets against http://localhost by default", () => {
    expect(safeNavigationUrl("issues/1")).toBe("/issues/1")
    expect(() => safeNavigationUrl("https://app.example/")).toThrow(NavigationUrlError)
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
    expect(() => safeNavigationUrl(url, { baseUrl })).toThrow(NavigationUrlError)
  })

  it("allows absolute URLs only for explicitly allowed HTTP(S) origins", () => {
    expect(
      safeNavigationUrl("https://docs.example/start?x=1", {
        baseUrl,
        allowedOrigins: ["not a url", new URL("https://docs.example/ignored-path")]
      })
    ).toBe("https://docs.example/start?x=1")
    expect(() =>
      safeNavigationUrl("http://docs.example/start", {
        baseUrl,
        allowedOrigins: ["https://docs.example"]
      })
    ).toThrow(NavigationUrlError)
  })
})
