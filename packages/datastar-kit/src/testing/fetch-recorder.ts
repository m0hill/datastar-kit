import type {
  DatastarFetchRecorderInclude,
  DatastarFetchRecorderInstallation,
  DatastarFetchRecorderOptions
} from "./types.js"
import { createDatastarFlightRecorder } from "./recorder.js"
import { defaultResponseInspectionOptions, fetchErrorEvent, requestFromFetchArgs } from "./utils.js"

/**
 * Returns true when a request looks like it was initiated by Datastar's action runtime.
 */
export const isDatastarFetchRequest: DatastarFetchRecorderInclude = (request) =>
  request.headers.has("datastar-request")

/**
 * Installs a fetch wrapper that records Datastar requests and responses in browser-like tests.
 */
export const installDatastarFetchRecorder = (
  options: DatastarFetchRecorderOptions = {}
): DatastarFetchRecorderInstallation => {
  const recorder = options.recorder ?? createDatastarFlightRecorder()
  const include = options.include ?? isDatastarFetchRequest
  const inspectResponse = options.inspectResponse ?? defaultResponseInspectionOptions
  const target = options.target ?? globalThis
  const originalFetch = target.fetch
  const callOriginalFetch: typeof fetch = originalFetch.bind(target)
  const pending = new Set<Promise<void>>()

  const track = (promise: Promise<void>): void => {
    pending.add(promise)
    void promise.finally(() => {
      pending.delete(promise)
    })
  }

  const recordableRequest = (args: Parameters<typeof fetch>): Request | undefined => {
    let request: Request
    try {
      request = requestFromFetchArgs(...args)
    } catch {
      return undefined
    }

    return include(request) ? request : undefined
  }

  const recordRequest = async (request: Request): Promise<void> => {
    try {
      await recorder.recordRequest(request)
    } catch (error) {
      recorder.recordEvent(fetchErrorEvent(error, request))
    }
  }

  const recordResponse = async (response: Response, request: Request): Promise<void> => {
    try {
      await recorder.recordResponse(response.clone(), inspectResponse)
    } catch (error) {
      recorder.recordEvent(fetchErrorEvent(error, request))
    }
  }

  const wrappedFetch: typeof fetch = async (...args) => {
    const request = recordableRequest(args)
    if (request !== undefined) await recordRequest(request)

    try {
      const response = await callOriginalFetch(...args)
      if (request !== undefined) track(recordResponse(response, request))
      return response
    } catch (error) {
      if (request !== undefined) recorder.recordEvent(fetchErrorEvent(error, request))
      throw error
    }
  }

  target.fetch = wrappedFetch

  return {
    recorder,
    async flush() {
      while (pending.size > 0) {
        await Promise.all(pending)
      }
    },
    uninstall() {
      if (target.fetch === wrappedFetch) {
        target.fetch = originalFetch
      }
    }
  }
}
