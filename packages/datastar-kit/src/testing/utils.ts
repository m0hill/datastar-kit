import * as read from "../read.js"
import type { SignalState } from "../types.js"
import type {
  DatastarErrorEvent,
  DatastarErrorEventType,
  DatastarFetchErrorEvent,
  DatastarHandlerErrorEvent,
  DatastarOptionalRecordedSignals,
  DatastarRecordedError,
  DatastarRequestTarget,
  DatastarResponseInspectionOptions,
  TextExpectation
} from "./types.js"

export const defaultResponseInspectionOptions: DatastarResponseInspectionOptions = {
  timeoutMs: 1000,
  maxBytes: 1_000_000
}

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const isSignalState = (value: unknown): value is SignalState => isRecord(value)

export const recordedError = (error: unknown): DatastarRecordedError => {
  if (error instanceof read.SignalParseError || error instanceof read.SignalShapeError) {
    return {
      name: error.constructor.name,
      message: error.message,
      input: error.input
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    }
  }

  return {
    name: "Error",
    message: String(error)
  }
}

const requestTarget = (request?: Request): DatastarRequestTarget =>
  request === undefined
    ? {}
    : {
        method: request.method.toUpperCase(),
        url: request.url
      }

const errorEvent = <Type extends DatastarErrorEventType>(
  type: Type,
  error: unknown,
  request?: Request
): DatastarErrorEvent<Type> => ({
  type,
  ...requestTarget(request),
  error: recordedError(error)
})

export const fetchErrorEvent = (error: unknown, request?: Request): DatastarFetchErrorEvent =>
  errorEvent("fetch.error", error, request)

export const handlerErrorEvent = (error: unknown, request?: Request): DatastarHandlerErrorEvent =>
  errorEvent("handler.error", error, request)

export const requestFromFetchArgs = (...[input, init]: Parameters<typeof fetch>): Request =>
  input instanceof Request && init === undefined ? input.clone() : new Request(input, init)

export const parseSignalsSource = (
  source: string,
  options: { readonly strictJson?: boolean } = {}
): DatastarOptionalRecordedSignals => {
  try {
    const value: unknown = JSON.parse(source)
    if (!isSignalState(value)) {
      return { signalError: recordedError(new read.SignalShapeError(value)) }
    }

    return { signals: value }
  } catch (cause) {
    return options.strictJson
      ? { signalError: recordedError(new read.SignalParseError(source, { cause })) }
      : {}
  }
}

export const parseScriptAttributes = (
  value: string | null
): Readonly<Record<string, string>> | undefined => {
  if (value === null) return undefined

  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined

    const attributes: Record<string, string> = {}
    for (const [key, item] of Object.entries(parsed)) {
      attributes[key] = String(item)
    }
    return attributes
  } catch {
    return undefined
  }
}

export const appendDataLine = (data: Record<string, string>, line: string): void => {
  const separator = line.indexOf(" ")
  const key = separator === -1 ? line : line.slice(0, separator)
  const value = separator === -1 ? "" : line.slice(separator + 1)

  data[key] = data[key] === undefined ? value : `${data[key]}\n${value}`
}

export const describeObject = (value: unknown): string =>
  JSON.stringify(
    value,
    (_key, item: unknown) => (item instanceof RegExp ? item.toString() : item),
    2
  )

export const describeExpectation = (value: unknown): string =>
  value instanceof RegExp ? value.toString() : describeObject(value)

export const matchesText = (
  actual: string | undefined,
  expected: TextExpectation<string | undefined> | undefined
): boolean => {
  if (expected === undefined) return true
  if (actual === undefined) return false
  return expected instanceof RegExp ? new RegExp(expected).test(actual) : actual === expected
}

export const matchesValue = (actual: unknown, expected: unknown): boolean => {
  if (expected instanceof RegExp) {
    return typeof actual === "string" && matchesText(actual, expected)
  }

  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => matchesValue(actual[index], item))
    )
  }

  if (isRecord(expected)) {
    if (!isRecord(actual)) return false

    return Object.entries(expected).every(([key, value]) => matchesValue(actual[key], value))
  }

  return Object.is(actual, expected)
}
