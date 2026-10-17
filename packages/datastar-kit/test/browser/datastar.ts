import { renderToString, type HtmlChild } from "../../src/html.js"

export const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"

export const loadDatastar = (): Promise<{ readonly attribute: (plugin: unknown) => void }> =>
  import(/* @vite-ignore */ DATASTAR_RUNTIME)

export const mount = (node: HtmlChild): void => {
  document.body.innerHTML = renderToString(node)
}

export const query = (selector: string, root: ParentNode = document): HTMLElement =>
  queryAs(HTMLElement, selector, root)

export const queryAs = <E extends Element>(
  type: abstract new () => E,
  selector: string,
  root: ParentNode = document
): E => {
  const element = root.querySelector(selector)
  if (!(element instanceof type)) throw new Error(`Missing ${type.name}: ${selector}`)
  return element
}

export const nextFetchFinished = (): Promise<void> =>
  new Promise((resolve) => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<{ readonly type?: string }>).detail.type !== "finished") return
      document.removeEventListener("datastar-fetch", listener)
      resolve()
    }
    document.addEventListener("datastar-fetch", listener)
  })
