import { renderToString, type HtmlChild } from "../../src/html.js"

export const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"

export const loadDatastar = (): Promise<unknown> => import(/* @vite-ignore */ DATASTAR_RUNTIME)

export const mount = (node: HtmlChild): void => {
  document.body.innerHTML = renderToString(node)
}

export const query = (selector: string, root: ParentNode = document): HTMLElement => {
  const element = root.querySelector(selector)
  if (!(element instanceof HTMLElement)) throw new Error(`Missing element: ${selector}`)
  return element
}

export const text = (selector: string): string | null => query(selector).textContent
