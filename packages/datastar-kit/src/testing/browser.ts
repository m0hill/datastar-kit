import * as read from "../read.js"
import type {
  DatastarBrowserRecorderInstallation,
  DatastarBrowserRecorderOptions,
  DatastarBrowserRecorderScriptOptions,
  DatastarBrowserSignalPatchEvent,
  DatastarBrowserUserEvent,
  DatastarDomMutation,
  DatastarDomMutationEvent,
  InjectDatastarBrowserRecorderOptions
} from "./types.js"
import { installDatastarFetchRecorder } from "./fetch-recorder.js"
import { createDatastarFlightRecorder } from "./recorder.js"
import { isRecord, isSignalState, recordedError } from "./utils.js"

type BrowserElementLike = Pick<Element, "getAttribute" | "getAttributeNames"> &
  Partial<Pick<Element, "tagName" | "id">> & {
    readonly parentElement?: unknown
  }

const isBrowserElementLike = (value: unknown): value is BrowserElementLike =>
  typeof value === "object" &&
  value !== null &&
  "getAttribute" in value &&
  typeof value.getAttribute === "function" &&
  "getAttributeNames" in value &&
  typeof value.getAttributeNames === "function"

const browserParentElement = (node: unknown): unknown =>
  isRecord(node) && "parentElement" in node ? node.parentElement : undefined

const describeBrowserNode = (node: unknown): string => {
  if (isBrowserElementLike(node)) {
    const tag = node.tagName?.toLowerCase() ?? "element"
    const id = node.id === undefined || node.id.length === 0 ? "" : `#${node.id}`
    return `${tag}${id}`
  }

  if (typeof Node !== "undefined" && node instanceof Node) {
    if (node.nodeType === Node.TEXT_NODE) return `text ${JSON.stringify(node.textContent ?? "")}`
    if (node.nodeType === Node.DOCUMENT_NODE) return "#document"
  }

  return "node"
}

const describeBrowserNodeSnapshot = (node: unknown): string => {
  if (isRecord(node) && typeof node.outerHTML === "string") return node.outerHTML
  if (isRecord(node) && typeof node.textContent === "string") return node.textContent
  return describeBrowserNode(node)
}

const datastarEventAttribute = (
  element: BrowserElementLike
): Pick<DatastarBrowserUserEvent, "datastarAttribute" | "expression"> | undefined => {
  const datastarAttribute = element.getAttributeNames().find((name) => name.startsWith("data-on:"))
  if (datastarAttribute === undefined) return undefined

  const expression = element.getAttribute(datastarAttribute) ?? undefined
  return {
    datastarAttribute,
    ...(expression === undefined ? {} : { expression })
  }
}

const browserUserEvent = (event: Event): DatastarBrowserUserEvent | undefined => {
  let node: unknown = event.target

  while (node !== undefined && node !== null) {
    if (isBrowserElementLike(node)) {
      const datastar = datastarEventAttribute(node)
      if (datastar !== undefined) {
        return {
          type: "browser.user",
          event: event.type,
          target: describeBrowserNode(node),
          ...datastar
        }
      }
    }

    node = browserParentElement(node)
  }

  return undefined
}

const browserSignalPatchEvent = (event: Event): DatastarBrowserSignalPatchEvent => {
  const detail: unknown = "detail" in event ? event.detail : undefined

  if (isSignalState(detail)) {
    return {
      type: "browser.signal.patch",
      signals: detail
    }
  }

  return {
    type: "browser.signal.patch",
    signalError: recordedError(new read.SignalShapeError(detail))
  }
}

const domMutationEvent = (
  records: readonly MutationRecord[]
): DatastarDomMutationEvent | undefined => {
  const mutations: DatastarDomMutation[] = records.map((record) => ({
    type: record.type,
    target: describeBrowserNode(record.target),
    ...(record.attributeName == null ? {} : { attributeName: record.attributeName }),
    ...(record.oldValue == null ? {} : { oldValue: record.oldValue }),
    ...(record.type === "childList"
      ? {
          addedNodes: Array.from(record.addedNodes, describeBrowserNodeSnapshot),
          removedNodes: Array.from(record.removedNodes, describeBrowserNodeSnapshot)
        }
      : {}),
    ...(record.type === "characterData" ? { text: record.target.textContent ?? "" } : {})
  }))

  return mutations.length === 0 ? undefined : { type: "browser.dom.mutation", mutations }
}

const defaultBrowserUserEvents = ["click", "submit", "input", "change"] as const

const browserDocument = (): Document | undefined =>
  typeof document === "undefined" ? undefined : document

const browserMutationObserver = (): typeof MutationObserver | undefined =>
  typeof MutationObserver === "undefined" ? undefined : MutationObserver

/**
 * Installs browser-side Flight Recorder hooks for user events, Datastar signal patches, DOM
 * mutations, and Datastar fetches.
 */
export const installDatastarBrowserRecorder = (
  options: DatastarBrowserRecorderOptions = {}
): DatastarBrowserRecorderInstallation => {
  const recorder = options.recorder ?? createDatastarFlightRecorder()
  const fetchInstallation = installDatastarFetchRecorder({
    recorder,
    ...(options.include === undefined ? {} : { include: options.include }),
    ...(options.inspectResponse === undefined ? {} : { inspectResponse: options.inspectResponse }),
    ...(options.target === undefined ? {} : { target: options.target })
  })
  const documentTarget = options.document ?? browserDocument()
  const cleanup: Array<() => void> = []

  if (documentTarget !== undefined) {
    const userEvents =
      options.userEvents === undefined ? defaultBrowserUserEvents : options.userEvents

    if (userEvents !== false) {
      for (const eventName of userEvents) {
        const listener = (event: Event) => {
          const recorded = browserUserEvent(event)
          if (recorded !== undefined) recorder.recordEvent(recorded)
        }
        documentTarget.addEventListener(eventName, listener, true)
        cleanup.push(() => documentTarget.removeEventListener(eventName, listener, true))
      }
    }

    if (options.signalPatches !== false) {
      const listener = (event: Event) => {
        recorder.recordEvent(browserSignalPatchEvent(event))
      }
      documentTarget.addEventListener("datastar-signal-patch", listener)
      cleanup.push(() => documentTarget.removeEventListener("datastar-signal-patch", listener))
    }

    if (options.domMutations !== false) {
      const Observer = options.mutationObserver ?? browserMutationObserver()
      const target = options.mutationTarget ?? documentTarget.documentElement ?? documentTarget.body

      if (Observer !== undefined && target !== undefined) {
        const observer = new Observer((records) => {
          const event = domMutationEvent(records)
          if (event !== undefined) recorder.recordEvent(event)
        })
        observer.observe(target, {
          attributeOldValue: true,
          attributes: true,
          characterData: true,
          characterDataOldValue: true,
          childList: true,
          subtree: true
        })
        cleanup.push(() => observer.disconnect())
      }
    }
  }

  return {
    recorder,
    async flush() {
      await fetchInstallation.flush()
    },
    uninstall() {
      for (const dispose of cleanup.splice(0)) {
        dispose()
      }
      fetchInstallation.uninstall()
    }
  }
}

const serializedBrowserRecorderOptions = (
  options: DatastarBrowserRecorderScriptOptions
): string => {
  const entries: string[] = []

  if (options.fetches === false) entries.push("include: () => false")
  if (options.userEvents !== undefined) {
    entries.push(`userEvents: ${JSON.stringify(options.userEvents)}`)
  }
  if (options.signalPatches !== undefined) {
    entries.push(`signalPatches: ${JSON.stringify(options.signalPatches)}`)
  }
  if (options.domMutations !== undefined) {
    entries.push(`domMutations: ${JSON.stringify(options.domMutations)}`)
  }

  return `{${entries.join(", ")}}`
}

/**
 * Returns an install script for browser Flight Recorder tests.
 */
export const datastarBrowserRecorderScript = (
  options: DatastarBrowserRecorderScriptOptions = {}
): string => {
  const module = options.module ?? "datastar-kit/testing"
  const globalName = options.globalName ?? "__datastarKitFlightRecorder"

  return `<script type="module">
  import { installDatastarBrowserRecorder } from ${JSON.stringify(module)}
  globalThis[${JSON.stringify(globalName)}] = installDatastarBrowserRecorder(${serializedBrowserRecorderOptions(options)})
</script>`
}

/**
 * Injects browser Flight Recorder setup before the Datastar runtime when possible.
 */
export const injectDatastarBrowserRecorder = (
  html: string,
  options: InjectDatastarBrowserRecorderOptions = {}
): string => {
  const globalName = options.globalName ?? "__datastarKitFlightRecorder"
  if (options.skipIfPresent !== false && html.includes(globalName)) return html

  const script = datastarBrowserRecorderScript(options)
  const datastarRuntime = /<script\b(?=[^>]*\bsrc=(['"])[^'"]*datastar[^'"]*\1)[^>]*>/iu.exec(html)
  if (datastarRuntime !== null) {
    return `${html.slice(0, datastarRuntime.index)}${script}${html.slice(datastarRuntime.index)}`
  }

  const headClose = /<\/head\s*>/iu.exec(html)
  if (headClose !== null) {
    return `${html.slice(0, headClose.index)}${script}${html.slice(headClose.index)}`
  }

  return `${script}${html}`
}
