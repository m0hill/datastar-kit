import type {
  DatastarFlight,
  DatastarFlightEvent,
  DatastarFlightMergeOptions,
  DatastarFlightRecorder,
  DatastarFlightRecorderOptions,
  MutableFlightEventMeta
} from "./types.js"
import { assertDatastarFlight } from "./assertions.js"
import { formatDatastarFlight } from "./format.js"
import { inspectDatastarRequest, inspectDatastarResponse } from "./protocol.js"
import { defaultResponseInspectionOptions, handlerErrorEvent } from "./utils.js"

/**
 * Combines multiple Flight Recorder timelines into one timeline for cross-boundary debugging.
 */
export const mergeDatastarFlights = (
  flights: readonly DatastarFlight[],
  options: DatastarFlightMergeOptions = {}
): DatastarFlight => {
  const indexed = flights
    .flatMap((flight) => flight.events)
    .map((event, index) => ({ event, index }))

  if (options.sortByTimestamp !== false) {
    indexed.sort((left, right) => {
      const leftTimestamp = left.event.timestamp
      const rightTimestamp = right.event.timestamp

      if (leftTimestamp !== undefined && rightTimestamp !== undefined) {
        const timestampOrder = leftTimestamp - rightTimestamp
        if (timestampOrder !== 0) return timestampOrder
      }

      return left.index - right.index
    })
  }

  return { events: indexed.map(({ event }) => event) }
}

/**
 * Creates a handler-level Flight Recorder for Datastar request/response tests.
 */
export const createDatastarFlightRecorder = (
  options: DatastarFlightRecorderOptions = {}
): DatastarFlightRecorder => {
  const events: DatastarFlightEvent[] = []
  const inspectResponse = options.inspectResponse ?? defaultResponseInspectionOptions
  const timestamp =
    typeof options.timestamp === "function"
      ? options.timestamp
      : options.timestamp === true
        ? Date.now
        : undefined
  let sequence = 0

  const addMetadata = <Event extends DatastarFlightEvent>(event: Event): Event => {
    const meta: MutableFlightEventMeta = {}

    if (options.source !== undefined && event.source === undefined) {
      meta.source = options.source
    }
    if (options.sequence === true && event.sequence === undefined) {
      meta.sequence = sequence
      sequence += 1
    }
    if (timestamp !== undefined && event.timestamp === undefined) {
      meta.timestamp = timestamp()
    }

    return Object.keys(meta).length === 0 ? event : ({ ...event, ...meta } as Event)
  }

  const pushEvent = <Event extends DatastarFlightEvent>(event: Event): Event => {
    const recorded = addMetadata(event)
    events.push(recorded)
    return recorded
  }

  const pushEvents = (items: readonly DatastarFlightEvent[]): readonly DatastarFlightEvent[] =>
    items.map(pushEvent)

  const recorder: DatastarFlightRecorder = {
    assert() {
      return assertDatastarFlight(recorder.flight())
    },
    clear() {
      events.length = 0
      sequence = 0
    },
    flight() {
      return { events: [...events] }
    },
    format() {
      return formatDatastarFlight(recorder.flight())
    },
    recordEvent(event) {
      pushEvent(event)
    },
    async recordRequest(request) {
      return pushEvent(await inspectDatastarRequest(request))
    },
    async recordResponse(response, responseOptions) {
      pushEvents(await inspectDatastarResponse(response, responseOptions ?? inspectResponse))
      return response
    },
    async handle(request, handler) {
      await recorder.recordRequest(request)

      let response: Response
      try {
        response = await handler(request)
      } catch (error) {
        pushEvent(handlerErrorEvent(error, request))
        throw error
      }

      await recorder.recordResponse(response)
      return response
    }
  }

  return recorder
}
