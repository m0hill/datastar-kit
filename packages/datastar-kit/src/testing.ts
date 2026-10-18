import type { PatchElementsMode, PatchElementsNamespace, SignalState } from "./sse.js"

/** A decoded `datastar-patch-elements` event with Datastar defaults filled in. */
export interface PatchElementsEvent {
  readonly type: "patch-elements"
  readonly selector: string | undefined
  readonly mode: PatchElementsMode
  readonly namespace: PatchElementsNamespace
  readonly useViewTransition: boolean
  readonly viewTransitionSelector: string | undefined
  readonly elements: string
  readonly id: string | undefined
  readonly retry: number
}

/** A decoded `datastar-patch-signals` event with its JSON signals parsed. */
export interface PatchSignalsEvent {
  readonly type: "patch-signals"
  readonly signals: SignalState
  readonly onlyIfMissing: boolean
  readonly id: string | undefined
  readonly retry: number
}

/** A Datastar SSE event decoded by `readEvents()`. */
export type DatastarEvent = PatchElementsEvent | PatchSignalsEvent

/** Error thrown when `readEvents()` receives something other than Datastar SSE events. */
export class DatastarEventError extends Error {}

interface RawEvent {
  readonly event: string
  readonly id: string | undefined
  readonly retry: number
  readonly data: ReadonlyMap<string, string>
}

const parseRawEvent = (block: string): RawEvent => {
  let event = ""
  let id: string | undefined
  let retry = 1000
  const data = new Map<string, string>()

  for (const line of block.split("\n")) {
    const colon = line.indexOf(":")
    const field = line.slice(0, colon)
    const value = line.slice(colon + 1).replace(/^ /u, "")

    if (field === "event") event = value
    else if (field === "id") id = value
    else if (field === "retry") retry = Number(value)
    else if (field === "data") {
      const space = value.indexOf(" ")
      const key = space === -1 ? value : value.slice(0, space)
      const text = space === -1 ? "" : value.slice(space + 1)
      const previous = data.get(key)
      data.set(key, previous === undefined ? text : `${previous}\n${text}`)
    }
  }

  return { event, id, retry, data }
}

const toDatastarEvent = ({ event, id, retry, data }: RawEvent): DatastarEvent => {
  if (event === "datastar-patch-signals") {
    return {
      type: "patch-signals",
      signals: JSON.parse(data.get("signals") ?? "{}"),
      onlyIfMissing: data.get("onlyIfMissing") === "true",
      id,
      retry
    }
  }

  if (event === "datastar-patch-elements") return toPatchElementsEvent(id, retry, data)

  throw new DatastarEventError(`Unexpected SSE event: ${JSON.stringify(event)}`)
}

const patchElementsModes: readonly PatchElementsMode[] = [
  "outer",
  "inner",
  "remove",
  "replace",
  "prepend",
  "append",
  "before",
  "after"
]
const patchElementsNamespaces: readonly PatchElementsNamespace[] = ["html", "svg", "mathml"]

const oneOf = <T extends string>(field: string, allowed: readonly T[], value: string): T => {
  const match = allowed.find((candidate) => candidate === value)
  if (match === undefined) {
    throw new DatastarEventError(`Unexpected patch-elements ${field}: ${JSON.stringify(value)}`)
  }
  return match
}

const toPatchElementsEvent = (
  id: string | undefined,
  retry: number,
  data: ReadonlyMap<string, string>
): PatchElementsEvent => ({
  type: "patch-elements",
  selector: data.get("selector"),
  mode: oneOf("mode", patchElementsModes, data.get("mode") ?? "outer"),
  namespace: oneOf("namespace", patchElementsNamespaces, data.get("namespace") ?? "html"),
  useViewTransition: data.get("useViewTransition") === "true",
  viewTransitionSelector: data.get("viewTransitionSelector"),
  elements: data.get("elements") ?? "",
  id,
  retry
})

// Heartbeat blocks hold only comment lines and carry no event.
const isEventBlock = (block: string): boolean =>
  block.split("\n").some((line) => line.length > 0 && !line.startsWith(":"))

/** Options for `readEvents()`. */
export interface ReadEventsOptions {
  /** Stop after this many events and cancel the rest of the body. Required for endless streams. */
  readonly count?: number
}

/**
 * Reads a Datastar SSE response and decodes its events for assertions in tests.
 *
 * @param response Response returned by a Datastar handler.
 * @param options Read options.
 * @returns The decoded events in the order the response sent them.
 */
export const readEvents = async (
  response: Response,
  options: ReadEventsOptions = {}
): Promise<ReadonlyArray<DatastarEvent>> => {
  const limit = options.count ?? Number.POSITIVE_INFINITY
  const events: DatastarEvent[] = []
  if (response.body === null || limit <= 0) return events

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.startsWith("text/event-stream")) {
    throw new DatastarEventError(
      `Expected a text/event-stream response, got ${JSON.stringify(contentType)}`
    )
  }

  let buffer = ""
  // Leaving the loop early cancels the body, which stops the handler's event source.
  for await (const text of response.body.pipeThrough(new TextDecoderStream())) {
    buffer += text
    const blocks = buffer.split("\n\n")
    buffer = blocks.pop() ?? ""

    for (const block of blocks.filter(isEventBlock)) {
      events.push(toDatastarEvent(parseRawEvent(block)))
      if (events.length >= limit) return events
    }
  }

  if (isEventBlock(buffer)) {
    throw new DatastarEventError(`SSE event ended without a blank line: ${JSON.stringify(buffer)}`)
  }

  return events
}
