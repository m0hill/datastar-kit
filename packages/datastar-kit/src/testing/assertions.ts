import type {
  DatastarBrowserSignalPatchEvent,
  DatastarBrowserUserEvent,
  DatastarBrowserUserExpectation,
  DatastarDirectHtmlEvent,
  DatastarDirectHtmlExpectation,
  DatastarDirectScriptEvent,
  DatastarDirectScriptExpectation,
  DatastarDirectSignalsEvent,
  DatastarDirectSignalsExpectation,
  DatastarDomMutation,
  DatastarDomMutationEvent,
  DatastarDomMutationExpectation,
  DatastarFlight,
  DatastarFlightAssertions,
  DatastarFlightEvent,
  DatastarPatchElementsEvent,
  DatastarPatchElementsExpectation,
  DatastarPatchSignalsEvent,
  DatastarPatchSignalsExpectation,
  DatastarRequestEvent,
  DatastarRequestExpectation,
  DatastarResponseAssertions,
  DatastarResponseDoneEvent,
  DatastarResponseInspectionOptions,
  SignalExpectation,
  TextExpectation
} from "./types.js"
import { formatDatastarFlight } from "./format.js"
import { inspectDatastarResponse } from "./protocol.js"
import { describeExpectation, matchesText, matchesValue } from "./utils.js"

/**
 * Error thrown by framework-agnostic Flight Recorder assertion helpers.
 */
export class DatastarFlightAssertionError extends Error {
  constructor(
    message: string,
    readonly flight: DatastarFlight
  ) {
    super(`${message}\n\n${formatDatastarFlight(flight)}`)
    this.name = "DatastarFlightAssertionError"
  }
}

const hasSignalError: (event: DatastarFlightEvent) => boolean = (event) => {
  switch (event.type) {
    case "request":
    case "direct.signals":
    case "patch.signals":
    case "browser.signal.patch":
      return event.signalError !== undefined
    default:
      return false
  }
}

const expectFlightEvent = <Event extends DatastarFlightEvent>(
  flight: DatastarFlight,
  description: string,
  matches: (event: DatastarFlightEvent) => event is Event
): Event => {
  const event = flight.events.find(matches)
  if (event === undefined) {
    throw new DatastarFlightAssertionError(
      `Expected Datastar flight to include ${description}`,
      flight
    )
  }
  return event
}

const requestMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarRequestExpectation
): event is DatastarRequestEvent => {
  if (event.type !== "request") return false
  if (expectation.method !== undefined && event.method !== expectation.method.toUpperCase()) {
    return false
  }
  if (!matchesText(event.url, expectation.url)) return false
  if (expectation.signals !== undefined && !matchesValue(event.signals, expectation.signals)) {
    return false
  }

  return true
}

const directHtmlMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarDirectHtmlExpectation
): event is DatastarDirectHtmlEvent =>
  event.type === "direct.html" &&
  matchesText(event.html, expectation.html) &&
  matchesText(event.selector, expectation.selector) &&
  matchesText(event.mode, expectation.mode) &&
  matchesText(event.namespace, expectation.namespace) &&
  (expectation.useViewTransition === undefined ||
    event.useViewTransition === expectation.useViewTransition)

const onlyIfMissingMatches = (
  event: { readonly onlyIfMissing?: boolean },
  expectation: { readonly onlyIfMissing?: boolean }
): boolean =>
  expectation.onlyIfMissing === undefined || event.onlyIfMissing === expectation.onlyIfMissing

const directSignalsMatches = (
  event: DatastarFlightEvent,
  signals: SignalExpectation,
  expectation: DatastarDirectSignalsExpectation
): event is DatastarDirectSignalsEvent =>
  event.type === "direct.signals" &&
  matchesValue(event.signals, signals) &&
  onlyIfMissingMatches(event, expectation)

const directSignalSourceMatches = (
  event: DatastarFlightEvent,
  source: TextExpectation<DatastarDirectSignalsEvent["signalsSource"]>,
  expectation: DatastarDirectSignalsExpectation
): event is DatastarDirectSignalsEvent =>
  event.type === "direct.signals" &&
  matchesText(event.signalsSource, source) &&
  onlyIfMissingMatches(event, expectation)

const directScriptMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarDirectScriptExpectation
): event is DatastarDirectScriptEvent =>
  event.type === "direct.script" &&
  matchesText(event.script, expectation.script) &&
  (expectation.attributes === undefined || matchesValue(event.attributes, expectation.attributes))

const completedMatches = (event: DatastarFlightEvent): event is DatastarResponseDoneEvent =>
  event.type === "response.done"

const patchElementsMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarPatchElementsExpectation
): event is DatastarPatchElementsEvent =>
  event.type === "patch.elements" &&
  matchesText(event.elements, expectation.elements) &&
  matchesText(event.selector, expectation.selector) &&
  (expectation.mode === undefined || event.mode === expectation.mode) &&
  (expectation.namespace === undefined || event.namespace === expectation.namespace) &&
  (expectation.useViewTransition === undefined ||
    event.useViewTransition === expectation.useViewTransition) &&
  matchesText(event.viewTransitionSelector, expectation.viewTransitionSelector)

const patchSignalsMatches = (
  event: DatastarFlightEvent,
  signals: SignalExpectation,
  expectation: DatastarPatchSignalsExpectation
): event is DatastarPatchSignalsEvent =>
  event.type === "patch.signals" &&
  matchesValue(event.signals, signals) &&
  onlyIfMissingMatches(event, expectation)

const patchSignalSourceMatches = (
  event: DatastarFlightEvent,
  source: TextExpectation<DatastarPatchSignalsEvent["signalsSource"]>,
  expectation: DatastarPatchSignalsExpectation
): event is DatastarPatchSignalsEvent =>
  event.type === "patch.signals" &&
  matchesText(event.signalsSource, source) &&
  onlyIfMissingMatches(event, expectation)

const browserUserEventMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarBrowserUserExpectation
): event is DatastarBrowserUserEvent =>
  event.type === "browser.user" &&
  (expectation.event === undefined || event.event === expectation.event) &&
  matchesText(event.target, expectation.target) &&
  matchesText(event.datastarAttribute, expectation.datastarAttribute) &&
  matchesText(event.expression, expectation.expression)

const browserSignalPatchMatches = (
  event: DatastarFlightEvent,
  signals: SignalExpectation
): event is DatastarBrowserSignalPatchEvent =>
  event.type === "browser.signal.patch" && matchesValue(event.signals, signals)

const domMutationMatches = (
  mutation: DatastarDomMutation,
  expectation: DatastarDomMutationExpectation
): boolean =>
  (expectation.type === undefined || mutation.type === expectation.type) &&
  matchesText(mutation.target, expectation.target) &&
  matchesText(mutation.attributeName, expectation.attributeName) &&
  matchesText(mutation.text, expectation.text)

const domMutationEventMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarDomMutationExpectation = {}
): event is DatastarDomMutationEvent =>
  event.type === "browser.dom.mutation" &&
  event.mutations.some((mutation) => domMutationMatches(mutation, expectation))

/**
 * Creates framework-agnostic semantic assertions for a recorded Datastar Flight.
 */
export const assertDatastarFlight = (flight: DatastarFlight): DatastarFlightAssertions => ({
  toHaveRequested(expectation) {
    return expectFlightEvent(flight, `request ${describeExpectation(expectation)}`, (event) =>
      requestMatches(event, expectation)
    )
  },
  toHaveDirectHtml(expectation) {
    return expectFlightEvent(flight, `direct HTML ${describeExpectation(expectation)}`, (event) =>
      directHtmlMatches(event, expectation)
    )
  },
  toHaveDirectSignals(signals, expectation = {}) {
    return expectFlightEvent(
      flight,
      `direct signals ${describeExpectation({ signals, ...expectation })}`,
      (event) => directSignalsMatches(event, signals, expectation)
    )
  },
  toHaveDirectSignalSource(source, expectation = {}) {
    return expectFlightEvent(
      flight,
      `raw direct signals ${describeExpectation({ source, ...expectation })}`,
      (event) => directSignalSourceMatches(event, source, expectation)
    )
  },
  toHaveDirectScript(expectation) {
    return expectFlightEvent(flight, `direct script ${describeExpectation(expectation)}`, (event) =>
      directScriptMatches(event, expectation)
    )
  },
  toHaveCompleted() {
    return expectFlightEvent(flight, "command completion response", completedMatches)
  },
  toHavePatchedElements(expectation) {
    return expectFlightEvent(flight, `element patch ${describeExpectation(expectation)}`, (event) =>
      patchElementsMatches(event, expectation)
    )
  },
  toHavePatchedSignals(signals, expectation = {}) {
    return expectFlightEvent(
      flight,
      `signal patch ${describeExpectation({ signals, ...expectation })}`,
      (event) => patchSignalsMatches(event, signals, expectation)
    )
  },
  toHavePatchedSignalSource(source, expectation = {}) {
    return expectFlightEvent(
      flight,
      `raw signal patch ${describeExpectation({ source, ...expectation })}`,
      (event) => patchSignalSourceMatches(event, source, expectation)
    )
  },
  toHaveBrowserUserEvent(expectation) {
    return expectFlightEvent(
      flight,
      `browser user event ${describeExpectation(expectation)}`,
      (event) => browserUserEventMatches(event, expectation)
    )
  },
  toHaveBrowserSignalPatch(signals) {
    return expectFlightEvent(
      flight,
      `browser signal patch ${describeExpectation(signals)}`,
      (event) => browserSignalPatchMatches(event, signals)
    )
  },
  toHaveDomMutation(expectation = {}) {
    return expectFlightEvent(flight, `DOM mutation ${describeExpectation(expectation)}`, (event) =>
      domMutationEventMatches(event, expectation)
    )
  },
  toHaveNoSignalErrors() {
    const errorCount: number = flight.events.filter(hasSignalError).length
    if (errorCount > 0) {
      throw new DatastarFlightAssertionError(
        `Expected Datastar flight not to contain signal errors, found ${errorCount}`,
        flight
      )
    }
  }
})

/**
 * Creates semantic assertions for a single Datastar response without consuming its body.
 */
export const assertDatastarResponse = (
  response: Response,
  options: DatastarResponseInspectionOptions = {}
): DatastarResponseAssertions => {
  const flight = inspectDatastarResponse(response, options).then(
    (events): DatastarFlight => ({
      events
    })
  )
  const assertions = flight.then(assertDatastarFlight)

  return {
    flight() {
      return flight
    },
    async format() {
      return formatDatastarFlight(await flight)
    },
    async toHaveCompleted() {
      return (await assertions).toHaveCompleted()
    },
    async toHaveDirectHtml(expectation) {
      return (await assertions).toHaveDirectHtml(expectation)
    },
    async toHaveDirectSignals(signals, expectation) {
      return (await assertions).toHaveDirectSignals(signals, expectation)
    },
    async toHaveDirectSignalSource(source, expectation) {
      return (await assertions).toHaveDirectSignalSource(source, expectation)
    },
    async toHaveDirectScript(expectation) {
      return (await assertions).toHaveDirectScript(expectation)
    },
    async toHavePatchedElements(expectation) {
      return (await assertions).toHavePatchedElements(expectation)
    },
    async toHavePatchedSignals(signals, expectation) {
      return (await assertions).toHavePatchedSignals(signals, expectation)
    },
    async toHavePatchedSignalSource(source, expectation) {
      return (await assertions).toHavePatchedSignalSource(source, expectation)
    },
    async toHaveNoSignalErrors() {
      return (await assertions).toHaveNoSignalErrors()
    }
  }
}
