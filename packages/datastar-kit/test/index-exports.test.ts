import { describe, expect, it } from "vitest"
import * as Root from "datastar-kit"
import * as sse from "datastar-kit/sse"
import {
  event,
  read,
  renderToString,
  reply,
  unsafeHtml,
  js,
  mod,
  post,
  preserve,
  signal,
  state
} from "datastar-kit"

describe("package root exports", () => {
  it("exports the tiny HTML surface and Web Standards SDK namespaces", () => {
    expect("Platform" in Root).toBe(false)
    expect("platformRouter" in Root).toBe(false)
    expect("Client" in Root).toBe(false)
    expect("datastarScript" in Root).toBe(false)
    expect("datastarDocument" in Root).toBe(false)
    expect("datastarPageResponse" in Root).toBe(false)
    expect("contract" in Root).toBe(false)
    expect("live" in Root).toBe(false)
    expect("ds" in Root).toBe(false)
    expect(Root.signal).toBe(signal)
    expect(Root.state).toBe(state)
    expect(Root.post).toBe(post)
    expect(Root.js).toBe(js)
    expect(Root.mod).toBe(mod)
    expect(Root.preserve).toBe(preserve)
    expect("expr" in Root).toBe(false)
    expect("withMods" in Root).toBe(false)
    expect("withModifiers" in Root).toBe(false)
    expect("on" in Root).toBe(false)
    expect("bind" in Root).toBe(false)
    expect("dataSignals" in Root).toBe(false)
    expect("pluginAttr" in Root).toBe(false)
    expect(Root.delete).toBeDefined()
    expect(event.patch).toBeDefined()
    expect(event.signals).toBeDefined()
    expect(event.script).toBeDefined()
    expect(event.navigate).toBeDefined()
    expect("patchElements" in event).toBe(false)
    expect("patchSignals" in event).toBe(false)
    expect("executeScript" in event).toBe(false)
    expect(renderToString).toBeDefined()
    expect("fragment" in Root).toBe(false)
    expect("page" in Root).toBe(false)
    expect("render" in Root).toBe(false)
    expect("props" in Root).toBe(false)
    expect("raw" in Root).toBe(false)
    expect(unsafeHtml).toBeDefined()
    expect("h" in Root).toBe(false)
    expect("mergeProps" in Root).toBe(false)
    expect("HtmlNameError" in Root).toBe(false)
    expect("Sse" in Root).toBe(false)
    expect("sse" in Root).toBe(false)
    expect("patchElements" in Root).toBe(false)
    expect("patchSignals" in Root).toBe(false)
    expect("Html" in Root).toBe(false)
    expect("Jsx" in Root).toBe(false)
    expect("jsx" in Root).toBe(false)
    expect("Fragment" in Root).toBe(false)
    expect("Model" in Root).toBe(false)
    expect("Realtime" in Root).toBe(false)
    expect("liveQuery" in Root).toBe(false)
    expect("liveQueryResponse" in Root).toBe(false)
    expect("commandDone" in Root).toBe(false)
    expect("makeRealtimePubSub" in Root).toBe(false)
    expect("Security" in Root).toBe(false)
    expect("Validation" in Root).toBe(false)
    expect("Observability" in Root).toBe(false)
    expect("requireCsrfToken" in Root).toBe(false)
    expect("FormValidationError" in Root).toBe(false)
    expect("Telemetry" in Root).toBe(false)
    expect(read.signals).toBeDefined()
    expect("rawSignals" in read).toBe(false)
    expect("query" in read).toBe(false)
    expect("signalsFrom" in read).toBe(false)
    expect(reply.patch).toBeDefined()
    expect(reply.navigate).toBeDefined()
    expect(reply.directHtml).toBeDefined()
    expect("SseChunk" in reply).toBe(false)
    expect(sse.patchSignals).toBeDefined()
    expect("encodeJson" in sse).toBe(false)
    expect("eventStream" in sse).toBe(false)
  })
})
