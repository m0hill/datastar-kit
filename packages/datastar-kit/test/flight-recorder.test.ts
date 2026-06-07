import { describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"
import {
  assertDatastarFlight,
  assertDatastarResponse,
  createDatastarFlightRecorder,
  DatastarFlightAssertionError,
  datastarBrowserRecorderScript,
  datastarSseToFlightEvents,
  installDatastarBrowserRecorder,
  installDatastarFetchRecorder,
  formatDatastarFlight,
  injectDatastarBrowserRecorder,
  inspectDatastarRequest,
  inspectDatastarResponse,
  isDatastarFetchRequest,
  mergeDatastarFlights,
  parseDatastarSse
} from "datastar-kit/testing"
import { createDatastarBrowserTestServer } from "datastar-kit/testing/node"

class TestElement {
  readonly id: string
  readonly parentElement: TestElement | undefined

  constructor(
    readonly tagName: string,
    private readonly attributes: Readonly<Record<string, string>> = {},
    parentElement?: TestElement
  ) {
    this.id = attributes.id ?? ""
    this.parentElement = parentElement
  }

  get outerHTML(): string {
    return `<${this.tagName.toLowerCase()}${this.id.length === 0 ? "" : ` id="${this.id}"`}></${this.tagName.toLowerCase()}>`
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null
  }

  getAttributeNames(): string[] {
    return Object.keys(this.attributes)
  }
}

class TestDocument {
  readonly documentElement = new TestElement("html")
  readonly body = new TestElement("body")
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (listener === null) return
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (listener === null) return
    this.listeners.get(type)?.delete(listener)
  }

  emit(event: Event): void {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === "function") {
        listener(event)
      } else {
        listener.handleEvent(event)
      }
    }
  }
}

let currentMutationObserver: TestMutationObserver | undefined

const setCurrentMutationObserver = (observer: TestMutationObserver): void => {
  currentMutationObserver = observer
}

const testMutationObserver = (): TestMutationObserver | undefined => currentMutationObserver

class TestMutationObserver {
  disconnected = false

  constructor(private readonly callback: MutationCallback) {
    setCurrentMutationObserver(this)
  }

  observe(): void {}

  disconnect(): void {
    this.disconnected = true
  }

  emit(records: readonly Partial<MutationRecord>[]): void {
    this.callback(records as MutationRecord[], this as unknown as MutationObserver)
  }
}

describe("Datastar Flight Recorder protocol parsing", () => {
  it("parses Datastar SSE fields without making tests assert raw event strings", () => {
    const sse = parseDatastarSse(
      "event: datastar-patch-elements\nid: patch-1\nretry: 2000\ndata: selector #count\ndata: mode inner\ndata: elements <output>\ndata: elements 1\ndata: elements </output>\n\n"
    )

    expect(sse).toEqual([
      {
        event: "datastar-patch-elements",
        id: "patch-1",
        retry: 2000,
        data: {
          selector: "#count",
          mode: "inner",
          elements: "<output>\n1\n</output>"
        }
      }
    ])
  })

  it("normalizes SSE patches into semantic flight events", () => {
    const events = datastarSseToFlightEvents(
      parseDatastarSse(
        'event: datastar-patch-signals\ndata: onlyIfMissing true\ndata: signals {"count":1}\n\n'
      )
    )

    expect(events).toEqual([
      {
        type: "patch.signals",
        signalsSource: '{"count":1}',
        signals: { count: 1 },
        onlyIfMissing: true
      }
    ])
  })

  it("keeps raw signal sources when Datastar accepts expression-style patches", () => {
    const events = datastarSseToFlightEvents(
      parseDatastarSse("event: datastar-patch-signals\ndata: signals {count: 1}\n\n")
    )

    expect(events).toEqual([
      {
        type: "patch.signals",
        signalsSource: "{count: 1}",
        onlyIfMissing: false
      }
    ])
  })

  it("records JSON signal sources with invalid shapes as recorder errors", () => {
    const events = datastarSseToFlightEvents(
      parseDatastarSse("event: datastar-patch-signals\ndata: signals [1,2]\n\n")
    )

    expect(events).toEqual([
      {
        type: "patch.signals",
        signalsSource: "[1,2]",
        signalError: {
          name: "SignalShapeError",
          message: "Datastar signals must be a JSON object",
          input: [1, 2]
        },
        onlyIfMissing: false
      }
    ])
  })
})

describe("Datastar Flight Recorder response inspection", () => {
  it("inspects SSE signal patch responses without consuming the response body", async () => {
    const response = reply.signals({ count: 2 }, { onlyIfMissing: true })
    const events = await inspectDatastarResponse(response)

    expect(events).toEqual([
      {
        type: "response",
        status: 200,
        contentType: "text/event-stream"
      },
      {
        type: "patch.signals",
        signalsSource: '{"count":2}',
        signals: { count: 2 },
        onlyIfMissing: true
      }
    ])
    await expect(response.text()).resolves.toBe(
      'event: datastar-patch-signals\ndata: onlyIfMissing true\ndata: signals {"count":2}\n\n'
    )
  })

  it("asserts Datastar responses semantically without raw protocol strings", async () => {
    const signalResponse = reply.signals({ count: 2 }, { onlyIfMissing: true })
    const elementResponse = reply.patch(h("output", { id: "count" }, "2"), { selector: "#count" })

    await expect(
      assertDatastarResponse(signalResponse).toHavePatchedSignals(
        { count: 2 },
        { onlyIfMissing: true }
      )
    ).resolves.toMatchObject({ type: "patch.signals" })
    await expect(
      assertDatastarResponse(elementResponse).toHavePatchedElements({
        selector: "#count",
        elements: /<output id="count">2<\/output>/
      })
    ).resolves.toMatchObject({ type: "patch.elements" })
    await expect(signalResponse.text()).resolves.toContain("datastar-patch-signals")
  })

  it("inspects and asserts direct Datastar response escape hatches", async () => {
    const html = reply.directHtml(h("p", {}, "Saved"), { selector: "#flash" })
    await expect(inspectDatastarResponse(html)).resolves.toMatchObject([
      { type: "response", status: 200 },
      { type: "direct.html", selector: "#flash", html: "<p>Saved</p>" }
    ])
    await expect(
      assertDatastarResponse(html).toHaveDirectHtml({ selector: "#flash", html: /Saved/ })
    ).resolves.toMatchObject({ type: "direct.html" })

    const signals = reply.directSignals({ saved: true }, { onlyIfMissing: true })
    await expect(inspectDatastarResponse(signals)).resolves.toMatchObject([
      { type: "response", status: 200 },
      {
        type: "direct.signals",
        signalsSource: '{"saved":true}',
        signals: { saved: true },
        onlyIfMissing: true
      }
    ])
    await expect(
      assertDatastarResponse(signals).toHaveDirectSignals({ saved: true }, { onlyIfMissing: true })
    ).resolves.toMatchObject({ type: "direct.signals" })

    const script = reply.directScript("console.log('saved')", { attributes: { type: "module" } })
    await expect(inspectDatastarResponse(script)).resolves.toMatchObject([
      { type: "response", status: 200 },
      { type: "direct.script", script: "console.log('saved')", attributes: { type: "module" } }
    ])
    await expect(
      assertDatastarResponse(script).toHaveDirectScript({
        script: /saved/,
        attributes: { type: "module" }
      })
    ).resolves.toMatchObject({ type: "direct.script" })
  })

  it("records malformed direct JSON signal responses as recorder errors", async () => {
    await expect(
      inspectDatastarResponse(
        new Response("not json", {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" }
        })
      )
    ).resolves.toEqual([
      {
        type: "response",
        status: 200,
        contentType: "application/json; charset=utf-8"
      },
      {
        type: "direct.signals",
        signalsSource: "not json",
        signalError: {
          name: "SignalParseError",
          message: "Invalid Datastar signal JSON",
          input: "not json"
        }
      }
    ])
  })

  it("does not treat non-200 response bodies as Datastar patches", async () => {
    await expect(
      inspectDatastarResponse(
        new Response('{"count":99}', {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" }
        })
      )
    ).resolves.toEqual([
      {
        type: "response",
        status: 500,
        contentType: "application/json; charset=utf-8"
      }
    ])
  })

  it("records and asserts 204 command completion responses", async () => {
    const response = reply.done()

    await expect(inspectDatastarResponse(response)).resolves.toEqual([
      {
        type: "response",
        status: 204,
        contentType: null
      },
      { type: "response.done" }
    ])
    await expect(assertDatastarResponse(response).toHaveCompleted()).resolves.toEqual({
      type: "response.done"
    })
  })

  it("can truncate long-lived SSE response inspection instead of waiting forever", async () => {
    const chunk = new TextEncoder().encode(
      'event: datastar-patch-signals\ndata: signals {"count":1}\n\n'
    )
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(chunk)
        }
      }),
      { headers: { "content-type": "text/event-stream" } }
    )

    await expect(inspectDatastarResponse(response, { timeoutMs: 1 })).resolves.toEqual([
      {
        type: "response",
        status: 200,
        contentType: "text/event-stream"
      },
      {
        type: "patch.signals",
        signalsSource: '{"count":1}',
        signals: { count: 1 },
        onlyIfMissing: false
      },
      {
        type: "response.body.truncated",
        reason: "timeout",
        bytesRead: chunk.byteLength,
        timeoutMs: 1
      }
    ])
  })
})

describe("Datastar Flight Recorder browser tracing", () => {
  it("records user events from Datastar action attributes and browser signal patches", () => {
    const document = new TestDocument()
    const target = { fetch: async () => new Response("ok") }
    const installation = installDatastarBrowserRecorder({
      document: document as unknown as Document,
      domMutations: false,
      target
    })
    const button = new TestElement("button", {
      id: "save",
      "data-on:click__prevent": "@post('/save')"
    })
    const icon = new TestElement("span", {}, button)

    document.emit({ type: "click", target: icon } as unknown as Event)
    document.emit({
      type: "datastar-signal-patch",
      detail: { saved: true }
    } as unknown as Event)

    expect(installation.recorder.flight().events).toEqual([
      {
        type: "browser.user",
        event: "click",
        target: "button#save",
        datastarAttribute: "data-on:click__prevent",
        expression: "@post('/save')"
      },
      {
        type: "browser.signal.patch",
        signals: { saved: true }
      }
    ])
    expect(
      installation.recorder.assert().toHaveBrowserUserEvent({
        event: "click",
        target: /button#save/,
        expression: /post/
      })
    ).toMatchObject({ type: "browser.user" })
    expect(installation.recorder.assert().toHaveBrowserSignalPatch({ saved: true })).toMatchObject({
      type: "browser.signal.patch"
    })

    installation.uninstall()
    document.emit({ type: "click", target: icon } as unknown as Event)
    expect(installation.recorder.flight().events).toHaveLength(2)
  })

  it("records DOM mutation summaries around runtime changes", () => {
    currentMutationObserver = undefined
    const document = new TestDocument()
    const target = { fetch: async () => new Response("ok") }
    const installation = installDatastarBrowserRecorder({
      document: document as unknown as Document,
      mutationObserver: TestMutationObserver as unknown as typeof MutationObserver,
      target
    })
    const panel = new TestElement("section", { id: "panel" })
    const observer = testMutationObserver()
    if (observer === undefined) throw new Error("Expected MutationObserver to be installed")

    observer.emit([
      {
        type: "attributes",
        target: panel as unknown as Node,
        attributeName: "data-text",
        oldValue: "$old"
      }
    ])

    expect(installation.recorder.flight().events).toEqual([
      {
        type: "browser.dom.mutation",
        mutations: [
          {
            type: "attributes",
            target: "section#panel",
            attributeName: "data-text",
            oldValue: "$old"
          }
        ]
      }
    ])
    expect(
      installation.recorder.assert().toHaveDomMutation({
        type: "attributes",
        target: "section#panel",
        attributeName: "data-text"
      })
    ).toMatchObject({ type: "browser.dom.mutation" })

    installation.uninstall()
    expect(observer.disconnected).toBe(true)
  })

  it("generates and injects browser recorder scripts before the Datastar runtime", () => {
    const script = datastarBrowserRecorderScript({
      module: "/__datastar-kit/testing.js",
      fetches: false,
      userEvents: ["click"],
      domMutations: false
    })

    expect(script).toContain(
      'import { installDatastarBrowserRecorder } from "/__datastar-kit/testing.js"'
    )
    expect(script).toContain("include: () => false")
    expect(script).toContain('userEvents: ["click"]')
    expect(script).toContain("domMutations: false")

    const html =
      '<html><head><script type="module" src="/datastar.js"></script></head><body></body></html>'
    const injected = injectDatastarBrowserRecorder(html, {
      module: "/__datastar-kit/testing.js",
      fetches: false
    })

    expect(injected.indexOf("__datastarKitFlightRecorder")).toBeLessThan(
      injected.indexOf('src="/datastar.js"')
    )
    expect(injectDatastarBrowserRecorder(injected, { module: "/__datastar-kit/testing.js" })).toBe(
      injected
    )
  })

  it("starts a fetch-compatible browser test server with recorder injection", async () => {
    const fixture = await createDatastarBrowserTestServer({
      fetch: async (request) => {
        const url = new URL(request.url)
        if (url.pathname === "/") {
          return reply.page(h("main", {}, "Counter"), {
            head: h("script", { type: "module", src: "/datastar.js" })
          })
        }
        if (url.pathname === "/increment") {
          const signals = await read.signals(request)
          return reply.signals({ count: Number(signals.count) + 1 })
        }
        return new Response("Not Found", { status: 404 })
      }
    })

    try {
      const html = await fetch(fixture.url).then((response) => response.text())
      expect(html).toContain("__datastarKitFlightRecorder")
      expect(html.indexOf("__datastarKitFlightRecorder")).toBeLessThan(
        html.indexOf('src="/datastar.js"')
      )

      const response = await fetch(`${fixture.url}/increment`, {
        method: "POST",
        headers: { "datastar-request": "true" },
        body: JSON.stringify({ count: 1 })
      })
      await response.text()

      fixture.recorder.assert().toHaveRequested({
        method: "POST",
        url: /\/increment$/,
        signals: { count: 1 }
      })
      fixture.recorder.assert().toHavePatchedSignals({ count: 2 })
    } finally {
      await fixture.close()
    }
  })
})

describe("Datastar Flight Recorder handler tracing", () => {
  it("records request signals, handler responses, and parsed patches", async () => {
    const recorder = createDatastarFlightRecorder()
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 1 })
    })

    const response = await recorder.handle(request, async (handlerRequest) => {
      const signals = await read.signals(handlerRequest)
      return reply.signals({ count: Number(signals.count) + 1 })
    })

    await expect(response.text()).resolves.toBe(
      'event: datastar-patch-signals\ndata: signals {"count":2}\n\n'
    )
    expect(recorder.flight().events).toEqual([
      {
        type: "request",
        method: "POST",
        url: "http://localhost/increment",
        signals: { count: 1 }
      },
      {
        type: "response",
        status: 200,
        contentType: "text/event-stream"
      },
      {
        type: "patch.signals",
        signalsSource: '{"count":2}',
        signals: { count: 2 },
        onlyIfMissing: false
      }
    ])
    expect(recorder.format()).toContain("patch signals")
    expect(recorder.format()).toContain('"count": 2')

    expect(
      recorder.assert().toHaveRequested({
        method: "post",
        url: /\/increment$/,
        signals: { count: 1 }
      })
    ).toMatchObject({ type: "request" })
    expect(recorder.assert().toHavePatchedSignals({ count: 2 })).toMatchObject({
      type: "patch.signals"
    })
    expect(() => recorder.assert().toHaveNoSignalErrors()).not.toThrow()
  })

  it("records handler failures before rethrowing", async () => {
    const recorder = createDatastarFlightRecorder()
    const request = new Request("http://localhost/fail", {
      method: "POST",
      body: JSON.stringify({ count: 1 })
    })

    await expect(
      recorder.handle(request, async () => {
        throw new Error("database unavailable")
      })
    ).rejects.toThrow("database unavailable")

    expect(recorder.flight().events).toEqual([
      {
        type: "request",
        method: "POST",
        url: "http://localhost/fail",
        signals: { count: 1 }
      },
      {
        type: "handler.error",
        method: "POST",
        url: "http://localhost/fail",
        error: {
          name: "Error",
          message: "database unavailable"
        }
      }
    ])
    expect(recorder.format()).toContain("handler error POST http://localhost/fail")
  })

  it("can attach source, sequence, and timestamp metadata to recorded timelines", () => {
    const recorder = createDatastarFlightRecorder({
      source: "server",
      sequence: true,
      timestamp: () => Date.UTC(2026, 0, 1)
    })

    recorder.recordEvent({ type: "response.done" })

    expect(recorder.flight().events).toEqual([
      {
        type: "response.done",
        source: "server",
        sequence: 0,
        timestamp: Date.UTC(2026, 0, 1)
      }
    ])
    expect(recorder.format()).toContain("[server #0 2026-01-01T00:00:00.000Z]")

    recorder.clear()
    recorder.recordEvent({ type: "response.done" })
    expect(recorder.flight().events[0]).toMatchObject({ sequence: 0 })
  })

  it("merges browser and server flights into one timestamp-ordered timeline", () => {
    const merged = mergeDatastarFlights([
      {
        events: [
          {
            type: "patch.signals",
            source: "server",
            timestamp: 2,
            signalsSource: '{"saved":true}',
            signals: { saved: true },
            onlyIfMissing: false
          }
        ]
      },
      {
        events: [
          {
            type: "browser.user",
            source: "browser",
            timestamp: 1,
            event: "submit",
            target: "form#todo-form"
          }
        ]
      }
    ])

    expect(merged.events.map((event) => event.type)).toEqual(["browser.user", "patch.signals"])
    expect(formatDatastarFlight(merged)).toContain("[browser")
    expect(formatDatastarFlight(merged)).toContain("[server")
  })

  it("records signal parse failures without stealing the request from the handler", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: "not json"
    })

    const event = await inspectDatastarRequest(request)

    expect(event).toMatchObject({
      type: "request",
      method: "POST",
      signalError: {
        name: "SignalParseError",
        input: "not json"
      }
    })
    await expect(request.text()).resolves.toBe("not json")
  })

  it("asserts element patches and raw signal patch sources", () => {
    const assertions = assertDatastarFlight({
      events: [
        {
          type: "patch.elements",
          elements: "<output>2</output>",
          selector: "#count",
          mode: "inner",
          namespace: "html",
          useViewTransition: false
        },
        {
          type: "patch.signals",
          signalsSource: "{count: 2}",
          onlyIfMissing: false
        }
      ]
    })

    expect(
      assertions.toHavePatchedElements({
        selector: "#count",
        elements: /<output>2<\/output>/,
        mode: "inner"
      })
    ).toMatchObject({ type: "patch.elements" })
    expect(assertions.toHavePatchedSignalSource(/count: 2/)).toMatchObject({
      type: "patch.signals"
    })
  })

  it("throws assertion errors with the formatted flight attached", () => {
    const flight = {
      events: [
        {
          type: "patch.signals" as const,
          signalsSource: '{"count":2}',
          signals: { count: 2 },
          onlyIfMissing: false
        }
      ]
    }

    const assertion = () => assertDatastarFlight(flight).toHavePatchedSignals({ count: 3 })

    expect(assertion).toThrow(DatastarFlightAssertionError)
    expect(assertion).toThrow("Datastar Flight Recorder")
  })

  it("asserts that recorded flights contain no signal errors", () => {
    const flight = {
      events: [
        {
          type: "patch.signals" as const,
          signalsSource: "[1,2]",
          signalError: {
            name: "SignalShapeError",
            message: "Datastar signals must be a JSON object",
            input: [1, 2]
          },
          onlyIfMissing: false
        }
      ]
    }

    expect(() => assertDatastarFlight(flight).toHaveNoSignalErrors()).toThrow("found 1")
  })

  it("records fetch requests and responses without consuming caller-visible bodies", async () => {
    const originalFetch: typeof fetch = async (input) => {
      const request = input instanceof Request ? input : new Request(input)
      const signals = await read.signals(request)
      return reply.signals({ count: Number(signals.count) + 1 })
    }
    const target = { fetch: originalFetch }
    const installation = installDatastarFetchRecorder({ target })

    const response = await target.fetch(
      new Request("http://localhost/increment", {
        method: "POST",
        headers: { "datastar-request": "true" },
        body: JSON.stringify({ count: 1 })
      })
    )
    await installation.flush()

    await expect(response.text()).resolves.toBe(
      'event: datastar-patch-signals\ndata: signals {"count":2}\n\n'
    )
    expect(installation.recorder.flight().events).toEqual([
      {
        type: "request",
        method: "POST",
        url: "http://localhost/increment",
        signals: { count: 1 }
      },
      {
        type: "response",
        status: 200,
        contentType: "text/event-stream"
      },
      {
        type: "patch.signals",
        signalsSource: '{"count":2}',
        signals: { count: 2 },
        onlyIfMissing: false
      }
    ])

    installation.uninstall()
    expect(target.fetch).toBe(originalFetch)
  })

  it("ignores ordinary fetches by default and can be configured to include them", async () => {
    const originalFetch: typeof fetch = async () => new Response("ok")
    const target = { fetch: originalFetch }
    const installation = installDatastarFetchRecorder({ target })

    expect(isDatastarFetchRequest(new Request("http://localhost/api"))).toBe(false)
    expect(
      isDatastarFetchRequest(
        new Request("http://localhost/api", { headers: { "datastar-request": "true" } })
      )
    ).toBe(true)

    await target.fetch("http://localhost/api")
    await installation.flush()
    expect(installation.recorder.flight().events).toEqual([])
    installation.uninstall()

    const recordAll = installDatastarFetchRecorder({ target, include: () => true })
    await target.fetch("http://localhost/api")
    await recordAll.flush()
    expect(recordAll.recorder.flight().events).toEqual([
      {
        type: "request",
        method: "GET",
        url: "http://localhost/api",
        signals: {}
      },
      {
        type: "response",
        status: 200,
        contentType: "text/plain;charset=UTF-8"
      }
    ])
    recordAll.uninstall()
  })

  it("records fetch failures and rethrows them", async () => {
    const originalFetch: typeof fetch = async () => {
      throw new Error("offline")
    }
    const target = { fetch: originalFetch }
    const installation = installDatastarFetchRecorder({ target })

    await expect(
      target.fetch("http://localhost/fail", { headers: { "datastar-request": "true" } })
    ).rejects.toThrow("offline")

    expect(installation.recorder.flight().events).toEqual([
      {
        type: "request",
        method: "GET",
        url: "http://localhost/fail",
        signals: {}
      },
      {
        type: "fetch.error",
        method: "GET",
        url: "http://localhost/fail",
        error: {
          name: "Error",
          message: "offline"
        }
      }
    ])

    installation.uninstall()
  })

  it("formats timelines for debugging failed tests", () => {
    expect(
      formatDatastarFlight({
        events: [
          {
            type: "request",
            method: "POST",
            url: "http://localhost/increment",
            signals: { count: 1 }
          },
          {
            type: "patch.signals",
            signalsSource: '{"count":2}',
            signals: { count: 2 },
            onlyIfMissing: false
          }
        ]
      })
    ).toBe(`Datastar Flight Recorder

1. POST http://localhost/increment
   signals: {
     "count": 1
   }

2. patch signals
   {
     "count": 2
   }`)
  })
})
