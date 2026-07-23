import { createDatastarDebuggerElementClass, DATASTAR_DEBUGGER_ELEMENT_NAME } from "./element.js"

const defineDatastarDebugger = (): void => {
  if (
    typeof window === "undefined" ||
    typeof HTMLElement === "undefined" ||
    typeof customElements === "undefined" ||
    customElements.get(DATASTAR_DEBUGGER_ELEMENT_NAME)
  ) {
    return
  }
  customElements.define(DATASTAR_DEBUGGER_ELEMENT_NAME, createDatastarDebuggerElementClass())
}

const installDatastarDebugger = (): void => {
  if (typeof document === "undefined") return
  defineDatastarDebugger()
  if (document.querySelector(DATASTAR_DEBUGGER_ELEMENT_NAME)) return

  const element = document.createElement(DATASTAR_DEBUGGER_ELEMENT_NAME)
  if (document.body) document.body.appendChild(element)
  else {
    document.addEventListener("DOMContentLoaded", () => document.body?.appendChild(element), {
      once: true
    })
  }
}

installDatastarDebugger()
