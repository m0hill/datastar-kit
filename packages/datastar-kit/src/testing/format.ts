import type { DatastarFlight, DatastarFlightEvent } from "./types.js"
import { describeObject } from "./utils.js"

const formatEvent = (event: DatastarFlightEvent): readonly string[] => {
  switch (event.type) {
    case "request":
      return [
        `${event.method} ${event.url}`,
        event.signalError === undefined
          ? `signals: ${describeObject(event.signals)}`
          : `signals error: ${event.signalError.message}`
      ]
    case "response":
      return [`response ${event.status}`, `content-type: ${event.contentType ?? "<none>"}`]
    case "response.done":
      return ["response completed with no Datastar body"]
    case "response.body.truncated":
      return [
        `response body truncated (${event.reason})`,
        `bytes read: ${event.bytesRead}${event.maxBytes === undefined ? "" : ` / ${event.maxBytes}`}`
      ]
    case "direct.html":
      return [
        `direct HTML${event.selector === undefined ? "" : ` -> ${event.selector}`}`,
        event.html
      ]
    case "direct.signals":
      return [
        `direct signals${event.onlyIfMissing === true ? " (if missing)" : ""}`,
        event.signalError === undefined
          ? event.signals === undefined
            ? event.signalsSource
            : describeObject(event.signals)
          : `signals error: ${event.signalError.message}\n${event.signalsSource}`
      ]
    case "direct.script":
      return ["direct script", event.script]
    case "patch.elements":
      return [
        `patch elements (${event.mode}/${event.namespace})${event.selector === undefined ? "" : ` -> ${event.selector}`}`,
        event.elements
      ]
    case "patch.signals":
      return [
        `patch signals${event.onlyIfMissing ? " (if missing)" : ""}`,
        event.signalError === undefined
          ? event.signals === undefined
            ? event.signalsSource
            : describeObject(event.signals)
          : `signals error: ${event.signalError.message}\n${event.signalsSource}`
      ]
    case "fetch.error":
    case "handler.error": {
      const target = [event.method, event.url].filter((item) => item !== undefined).join(" ")
      return [
        `${event.type === "fetch.error" ? "fetch error" : "handler error"}${target.length === 0 ? "" : ` ${target}`}`,
        `${event.error.name}: ${event.error.message}`
      ]
    }
    case "browser.user":
      return [
        `${event.event} ${event.target}`,
        [event.datastarAttribute, event.expression].filter((item) => item !== undefined).join(" = ")
      ].filter((line) => line.length > 0)
    case "browser.signal.patch":
      return [
        "browser signal patch",
        event.signalError === undefined
          ? describeObject(event.signals)
          : `signals error: ${event.signalError.message}`
      ]
    case "browser.dom.mutation":
      return [
        "DOM mutation",
        ...event.mutations.map((mutation) => {
          const suffix = mutation.attributeName === undefined ? "" : ` ${mutation.attributeName}`
          return `${mutation.type}${suffix} -> ${mutation.target}`
        })
      ]
    case "sse.event":
      return [`SSE ${event.event}`, describeObject(event.data)]
    default:
      throw new TypeError(`Unhandled Datastar flight event: ${JSON.stringify(event)}`)
  }
}

const formatEventMeta = (event: DatastarFlightEvent): string => {
  const meta = [
    event.source,
    event.sequence === undefined ? undefined : `#${event.sequence}`,
    event.timestamp === undefined ? undefined : new Date(event.timestamp).toISOString()
  ].filter((item) => item !== undefined)

  return meta.length === 0 ? "" : `[${meta.join(" ")}] `
}

export const formatDatastarFlight = (flight: DatastarFlight): string => {
  const lines = ["Datastar Flight Recorder", ""]

  for (const [index, event] of flight.events.entries()) {
    const [title, ...details] = formatEvent(event)
    lines.push(`${index + 1}. ${formatEventMeta(event)}${title}`)
    for (const detail of details) {
      lines.push(...detail.split("\n").map((line) => (line.length === 0 ? "   " : `   ${line}`)))
    }
    lines.push("")
  }

  return lines.join("\n").trimEnd()
}
