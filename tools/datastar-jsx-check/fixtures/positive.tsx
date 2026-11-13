import { dataAttrs, js, signal, type Expr, type HtmlChild } from "datastar-kit"

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
const widget = signal<HTMLElement>("widget")
const todo = { id: 1 }
const RichComponent = (_props: { readonly payload: { readonly id: number } }) => <div />

export const positiveFixture = (
  <main>
    <div data-show={visible} />
    <li data-id={todo.id} />
    <div children={<span>Child</span>} />
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
      data-ref={widget}
      data-show={visible}
    >
      Child
    </typed-widget>
    <button data-on:click__delay="$count++" />
    <RichComponent payload={{ id: 1 }} />
    <unregistered-widget
      anything="loose"
      aria-label="Widget"
      data-show={visible}
    />
  </main>
)

const nestingRows = ["a", "b"]
const Card = (props: { readonly children?: HtmlChild }) => <section>{props.children}</section>

export const nestingPositiveFixture = (
  <main>
    <p>
      <span />
      <button>
        <div />
      </button>
      <Card>
        <div />
      </Card>
    </p>
    <ul>
      <li>
        <ul>
          <li />
        </ul>
      </li>
    </ul>
    <dl>
      <dt />
      <dd />
    </dl>
    <a href="/">
      <svg>
        <a href="#" />
      </svg>
    </a>
    <table>
      <caption>Rows</caption>
      <thead>
        <tr>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        {nestingRows.map((row) => (
          <tr>
            <td>
              <table>
                <tbody>
                  <tr>
                    <td>{row}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </main>
)
