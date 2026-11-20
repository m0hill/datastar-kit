import { reply as core, type HtmlChild, type SignalState } from "datastar-kit"
import { Data, Effect, Stream } from "effect"
import { HttpServerResponse } from "effect/http"

type Reply = Effect.Effect<HttpServerResponse.HttpServerResponse>

// Builds the Response per run: its body can be sent once, and a route reuses its effect.
const fromCore = (build: () => Response): Reply =>
  Effect.sync(() => HttpServerResponse.fromWeb(build()))

/**
 * Creates a full HTML document response.
 *
 * @param body Children rendered inside the document `<body>`.
 * @param options Document rendering options.
 */
export const page = (
  body: HtmlChild | readonly HtmlChild[],
  options: core.PageOptions = {}
): Reply => fromCore(() => core.page(body, options))

/**
 * Creates a Datastar SSE element patch response.
 *
 * @param elements HTML child tree to patch into the browser document.
 * @param options Datastar patch options.
 */
export const patch = (elements: HtmlChild, options: core.PatchOptions = {}): Reply =>
  fromCore(() => core.patch(elements, options))

/**
 * Creates a Datastar SSE response that removes elements from the browser document.
 *
 * @param selector CSS selector for the elements to remove.
 * @param options Event options such as `id` and view transitions.
 */
export const remove = (selector: string, options: core.RemoveOptions = {}): Reply =>
  fromCore(() => core.remove(selector, options))

/**
 * Creates a Datastar SSE signal patch response.
 *
 * @param value Signal state to patch.
 * @param options Datastar signal patch options.
 */
export const signals = (value: SignalState, options: core.SignalsOptions = {}): Reply =>
  fromCore(() => core.signals(value, options))

/** Error when a navigation URL is malformed, non-HTTP(S), or cross-origin without being allowlisted. */
export class NavigationError extends Data.TaggedError("NavigationError")<{
  readonly cause: core.NavigationUrlError
}> {}

/**
 * Creates a Datastar SSE response that safely navigates the browser.
 *
 * @param url Relative or allowlisted absolute URL to navigate to.
 * @param options Navigation and event options.
 * @returns The response. Fails with `NavigationError` for an unsafe URL.
 */
export const navigate = (
  url: string | URL,
  options: core.NavigateOptions = {}
): Effect.Effect<HttpServerResponse.HttpServerResponse, NavigationError> =>
  Effect.try({
    try: () => HttpServerResponse.fromWeb(core.navigate(url, options)),
    catch: (cause) => {
      if (cause instanceof core.NavigationUrlError) return new NavigationError({ cause })
      throw cause
    }
  })

/** Creates a Datastar command-completion response with no body (`204`). */
export const done = (): Reply => fromCore(() => core.done())

/**
 * Creates a Datastar SSE stream response from a stream of event chunks.
 *
 * @param events Event chunks, with failures handled: headers are sent before the stream runs.
 *   The stream runs with the services of the calling effect.
 * @param options SSE stream options.
 * @returns The response. Client disconnect interrupts the stream.
 */
export const stream = <R>(
  events: Stream.Stream<string | Uint8Array, never, R>,
  options: core.SseStreamOptions = {}
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
  Effect.map(Effect.context<R>(), (context) =>
    HttpServerResponse.fromWeb(core.stream(Stream.toAsyncIterableWith(events, context), options))
  )
