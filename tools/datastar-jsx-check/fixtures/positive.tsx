import { dataAttrs, js, signal, type Expr } from "datastar-kit"

declare module "datastar-kit/jsx-runtime" {
  interface CustomJsxAttributes {
    "data-focus-when"?: Expr<boolean>
    "hx-get"?: string
  }

  interface CustomJsxElements {
    "typed-widget": { mode: "compact" | "full" }
  }
}

const visible = signal<boolean>("visible")
const todo = { id: 1 }

export const positiveFixture = (
  <main>
    <div data-show={visible} />
    <li data-id={todo.id} />
    <button data-focus-when={visible} />
    <button data-on:click={js`${visible} = false`} />
    <div
      {...dataAttrs({ "data-state": "ready" })}
      hx-get="/fragment"
    />
    <typed-widget
      id="status"
      class="panel"
      aria-label="Status"
      mode="compact"
      data-show={visible}
    >
      Child
    </typed-widget>
    <button data-on:click__delay="$count++" />
    <unregistered-widget
      anything="loose"
      aria-label="Widget"
      data-show={visible}
    />
  </main>
)
