import { h, renderToString, type HtmlChild } from "../../src/html.js"
import { getPath } from "./vendor/datastar.js"

/** Reads a signal from the running Datastar instance. */
export const signalValue = (path: string): unknown => getPath(path)

/**
 * Renders `node` into the page and waits until Datastar has processed it.
 *
 * Datastar applies new elements from a MutationObserver callback, which runs before the awaited
 * microtask resumes. It applies attributes in document order, so a `data-init` sentinel rendered
 * after the node proves every attribute before it was applied. Not using timers keeps this safe
 * under fake timers.
 */
export const mount = async (node: HtmlChild): Promise<void> => {
  document.body.innerHTML = renderToString([
    node,
    h("span", { id: "mounted", "data-init": "el.dataset.ready = 'true'" })
  ])
  await new Promise<void>((resolve) => queueMicrotask(resolve))
  if (query("#mounted").dataset.ready !== "true") {
    throw new Error("Datastar did not process the mounted markup")
  }
}

export const query = (selector: string, root: ParentNode = document): HTMLElement => {
  const element = root.querySelector(selector)
  if (!(element instanceof HTMLElement)) throw new Error(`Missing element: ${selector}`)
  return element
}

export const text = (selector: string): string | null => query(selector).textContent

/** Sets an input's value the way typing does, firing the given event. */
export const typeInto = (selector: string, value: string, eventName = "input"): void => {
  const input = query(selector)
  if (!(input instanceof HTMLInputElement)) throw new Error(`Not an input: ${selector}`)
  input.value = value
  input.dispatchEvent(new Event(eventName, { bubbles: true }))
}
