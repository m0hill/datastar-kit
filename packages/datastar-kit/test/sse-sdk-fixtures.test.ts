import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"
import { executeScript, patchElements, patchSignals } from "../src/sse.js"
import type { SseEventOptions } from "../src/sse.js"

// Replays Datastar's SDK conformance goldens (see fixtures/datastar-sdk-golden/README.md) the way
// Datastar's own runner does: the case input arrives as the request's signals, and the server
// answers with the events it describes.
const goldenRoot = new URL("./fixtures/datastar-sdk-golden/", import.meta.url)

// Event options shared by every golden event, under Datastar's cross-SDK names.
const eventFields = {
  eventId: z.string().exactOptional(),
  retryDuration: z.number().exactOptional()
}

const GoldenInput = z.object({
  events: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("executeScript"),
        script: z.string(),
        attributes: z.record(z.string(), z.string()).exactOptional(),
        autoRemove: z.boolean().exactOptional(),
        ...eventFields
      }),
      z.object({
        type: z.literal("patchElements"),
        elements: z.string().default(""),
        selector: z.string().exactOptional(),
        mode: z
          .enum(["outer", "inner", "replace", "prepend", "append", "before", "after", "remove"])
          .exactOptional(),
        useViewTransition: z.boolean().exactOptional(),
        ...eventFields
      }),
      z.object({
        type: z.literal("patchSignals"),
        signals: z.record(z.string(), z.json()).exactOptional(),
        "signals-raw": z.string().exactOptional(),
        onlyIfMissing: z.boolean().exactOptional(),
        ...eventFields
      })
    ])
  )
})

type GoldenEvent = z.infer<typeof GoldenInput>["events"][number]

type SseEventOptionsDraft = { -readonly [Key in keyof SseEventOptions]: SseEventOptions[Key] }

const sseOptions = ({ eventId, retryDuration }: GoldenEvent): SseEventOptions => {
  const options: SseEventOptionsDraft = {}
  if (eventId !== undefined) options.id = eventId
  if (retryDuration !== undefined) options.retry = retryDuration
  return options
}

const encode = (event: GoldenEvent): string => {
  if (event.type === "executeScript") {
    const { type: _type, eventId: _id, retryDuration: _retry, script, ...options } = event
    return executeScript(script, { ...sseOptions(event), ...options })
  }
  if (event.type === "patchElements") {
    const { type: _type, eventId: _id, retryDuration: _retry, elements, ...options } = event
    return patchElements(elements, { ...sseOptions(event), ...options })
  }
  const {
    type: _type,
    eventId: _id,
    retryDuration: _retry,
    signals = {},
    "signals-raw": rawSignals,
    ...options
  } = event
  return patchSignals(rawSignals ?? signals, { ...sseOptions(event), ...options })
}

// The SDK side of the conformance server: read the signals, answer with the described events.
const respond = async (request: Request): Promise<string> => {
  const input = await read.validate(request, GoldenInput)
  if (input.issues) throw new Error(`Invalid golden input: ${JSON.stringify(input.issues)}`)
  return reply.stream(input.value.events.map(encode)).text()
}

// Parses SSE text the way Datastar's golden runner compares it: events in order, each field's
// values in order, and `data` lines grouped by their first word, ignoring the order between
// groups. The runner also ignores HTML attribute order; this comparison keeps it exact.
const parseEvents = (text: string) =>
  text
    .split("\n\n")
    .filter((block) => block.trim() !== "")
    .map((block) => {
      const fields: Record<string, string[]> = {}
      const data: Record<string, string[]> = {}
      for (const line of block.split("\n")) {
        const colon = line.indexOf(":")
        const name = line.slice(0, colon)
        const value = line.slice(colon + 1).trim()
        if (name === "data") {
          const space = value.indexOf(" ")
          const key = space === -1 ? value : value.slice(0, space)
          ;(data[key] ??= []).push(space === -1 ? "" : value.slice(space + 1))
        } else {
          ;(fields[name] ??= []).push(value)
        }
      }
      return { fields, data }
    })

const requestFor = (method: string, input: string): Request => {
  const headers = { accept: "text/event-stream", "datastar-request": "true" }
  if (method === "get") {
    const url = new URL("http://localhost/test")
    url.searchParams.set("datastar", input)
    return new Request(url, { headers })
  }
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: input
  })
}

const cases = ["get", "post"].flatMap((method) =>
  readdirSync(new URL(`${method}/`, goldenRoot)).map((name) => {
    const dir = new URL(`${method}/${name}/`, goldenRoot)
    return {
      label: `${method.toUpperCase()} ${name}`,
      method,
      input: readFileSync(new URL("input.json", dir), "utf8"),
      output: readFileSync(new URL("output.txt", dir), "utf8")
    }
  })
)

describe("Datastar SDK conformance goldens", () => {
  it.each(cases)("$label", async ({ method, input, output }) => {
    const response = await respond(requestFor(method, input))

    expect(parseEvents(response)).toEqual(parseEvents(output))
  })
})
