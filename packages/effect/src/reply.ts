import {
  event,
  renderPage,
  reply as core,
  type HtmlChild,
  type PageOptions,
  type SignalState
} from "datastar-kit"
import { Effect, Stream } from "effect"
import { HttpServerResponse } from "effect/http"

const sseOptions = {
  contentType: "text/event-stream",
  headers: { "cache-control": "no-cache" }
} as const

const sse = (body: string): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(body, sseOptions)

/**
 * Creates a full HTML document response.
 *
 * @param body Children rendered inside the document `<body>`.
 * @param options Document rendering options.
 */
export const page = (
  body: HtmlChild | readonly HtmlChild[],
  options: PageOptions = {}
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(renderPage(body, options), { contentType: "text/html; charset=utf-8" })

/**
 * Creates a Datastar SSE element patch response.
 *
 * @param elements HTML child tree to patch into the browser document.
 * @param options Datastar patch options.
 */
export const patch = (
  elements: HtmlChild,
  options: core.PatchOptions = {}
): HttpServerResponse.HttpServerResponse => sse(event.patch(elements, options))

/**
 * Creates a Datastar SSE response that removes elements from the browser document.
 *
 * @param selector CSS selector for the elements to remove.
 * @param options Event options such as `id` and view transitions.
 */
export const remove = (
  selector: string,
  options: event.RemoveOptions = {}
): HttpServerResponse.HttpServerResponse => sse(event.remove(selector, options))

/**
 * Creates a Datastar SSE signal patch response.
 *
 * @param value Signal state to patch.
 * @param options Datastar signal patch options.
 */
export const signals = (
  value: SignalState,
  options: core.SignalsOptions = {}
): HttpServerResponse.HttpServerResponse => sse(event.signals(value, options))

/**
 * Creates a Datastar SSE response that safely navigates the browser.
 *
 * @param url Relative or allowlisted absolute URL to navigate to.
 * @param options Navigation and event options.
 * @throws {@link core.NavigationUrlError} When the URL is malformed, non-HTTP(S), or cross-origin
 *   without being allowlisted.
 */
export const navigate = (
  url: string | URL,
  options: core.NavigateOptions = {}
): HttpServerResponse.HttpServerResponse => sse(event.navigate(url, options))

/** Creates a Datastar command-completion response with no body (`204`). */
export const done = (): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.empty({ status: 204 })

const withHeartbeat = <E, R>(
  events: Stream.Stream<string, E, R>,
  heartbeat: core.SseHeartbeatOptions
): Stream.Stream<string, E, R> => {
  const intervalMs = heartbeat.intervalMs ?? 15_000
  const comment = event.comment(heartbeat.comment ?? "heartbeat")
  const beats = Stream.fromEffect(Effect.sleep(heartbeat.initialDelayMs ?? intervalMs)).pipe(
    Stream.drain,
    Stream.concat(Stream.tick(intervalMs)),
    Stream.map(() => comment)
  )
  return Stream.merge(events, beats, { haltStrategy: "left" })
}

/**
 * Creates a Datastar SSE stream response from a stream of event chunks.
 *
 * @param events Event chunks. The stream runs with the services of the calling effect.
 * @param options SSE stream options.
 * @returns The response. Client disconnect interrupts the stream.
 */
export const stream = <E, R>(
  events: Stream.Stream<string, E, R>,
  options: core.SseStreamOptions = {}
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
  Effect.map(Effect.context<R>(), (context) => {
    const chunks =
      options.heartbeat === undefined ? events : withHeartbeat(events, options.heartbeat)
    return HttpServerResponse.stream(
      chunks.pipe(Stream.encodeText, Stream.provideContext(context)),
      sseOptions
    )
  })
