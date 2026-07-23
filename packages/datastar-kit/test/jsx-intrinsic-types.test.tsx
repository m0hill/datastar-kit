import { describe, expect, it } from "vitest"
import { dataAttrs } from "../src/data-attributes.js"
import {
  get,
  js,
  mod,
  signal,
  type DatastarAttributes,
  type DatastarAttributeValue,
  type DatastarSignalFilterInput,
  type DatastarSignalReference,
  type Expr,
  type SignalTarget
} from "../src/ds/index.js"
import { renderToString } from "../src/html.js"
import type { JSX as DatastarJsx } from "../src/jsx-runtime.js"

declare module "datastar-kit/jsx-runtime" {
  interface CustomJsxAttributes {
    "custom-expression"?: Expr
    "custom-object"?: { readonly id: number }
    "data-custom"?: DatastarAttributeValue
    "data-focus-when"?: Expr<boolean>
    "hx-get"?: string
    "x-data"?: string
  }

  interface CustomJsxElements {
    "typed-widget": {
      mode: "compact" | "full"
      count?: number
      payload?: { readonly id: number }
    }
  }
}

const typecheckOnly = (testCases: () => void): void => {
  void testCases
}

describe("typed JSX intrinsic elements", () => {
  it("renders typed HTML attributes", () => {
    const node = (
      <form
        method="post"
        enctype="multipart/form-data"
        novalidate
      >
        <label htmlFor="avatar">Avatar</label>
        <input
          id="avatar"
          type="file"
          accept="image/*"
          required
        />
        <button
          type="submit"
          disabled={false}
        >
          Upload
        </button>
      </form>
    )

    expect(renderToString(node)).toBe(
      '<form method="post" enctype="multipart/form-data" novalidate>' +
        '<label for="avatar">Avatar</label>' +
        '<input id="avatar" type="file" accept="image/*" required>' +
        '<button type="submit">Upload</button></form>'
    )
  })

  it("renders typed Datastar attributes", () => {
    const query = signal<string, "query">("query")

    const node = (
      <input
        type="search"
        data-bind={query}
        data-on:input={mod(get("/search"), { debounce: "300ms" })}
        data-attr:aria-busy={js`${query}.length > 0`}
      />
    )

    expect(renderToString(node)).toBe(
      '<input type="search" data-bind="query" data-on:input__debounce.300ms="@get(&quot;/search&quot;)" data-attr:aria-busy="$query.length &gt; 0">'
    )
  })

  it("checks values written by mutating Datastar attributes", () => {
    const text = signal<string>("fetching")
    const flag = signal<boolean>("element")
    const maybeFetching = signal<boolean | undefined>("maybeFetching")
    const form = signal<HTMLFormElement>("form")
    const anyElement = signal<Element>("anyElement")
    const button = signal<HTMLButtonElement>("button")
    const count = signal<number>("count")
    const structuralReference = {
      name: "structural",
      toDatastarExpression: () => "$structural"
    }

    const indicatorTarget: SignalTarget<boolean> = maybeFetching
    const readOnlyText: Expr<string> = text
    const writeOnlyText: SignalTarget<string> = text
    const textBinding: DatastarSignalReference<string, string> = text
    // @ts-expect-error A boolean signal cannot satisfy a string read/write binding.
    const invalidTextBinding: DatastarSignalReference<string, string> = flag
    void indicatorTarget
    void readOnlyText
    void writeOnlyText
    void textBinding
    void invalidTextBinding

    const nodes = [
      <button data-indicator={flag} />,
      <form data-ref={form} />,
      <form data-ref={anyElement} />,
      <select data-bind={count} />,
      // @ts-expect-error A readable expression alone cannot be used for two-way binding.
      <input data-bind={readOnlyText} />,
      // @ts-expect-error A write target alone cannot be used for two-way binding.
      <input data-bind={writeOnlyText} />,
      // @ts-expect-error data-indicator writes booleans, not strings.
      <button data-indicator={text} />,
      // @ts-expect-error data-ref writes the concrete element, not a boolean.
      <div data-ref={flag} />,
      // @ts-expect-error A form element cannot be written to a button-only signal.
      <form data-ref={button} />,
      // @ts-expect-error data-bind requires a branded readable and writable signal.
      <input data-bind={structuralReference} />
    ]

    expect(nodes).toHaveLength(10)
  })

  it("matches file input bindings to encoded file arrays", () => {
    typecheckOnly(() => {
      const files =
        signal<
          readonly { readonly name: string; readonly contents: string; readonly mime: string }[]
        >("files")
      const text = signal<string>("text")
      const nodes = [
        <input
          type="file"
          data-bind={files}
        />,
        // @ts-expect-error File inputs write encoded file arrays, not strings.
        <input
          type="file"
          data-bind={text}
        />
      ]

      void nodes
    })

    expect(true).toBe(true)
  })

  it("matches input bindings to their native value adapters", () => {
    typecheckOnly(() => {
      const text = signal<string>("text")
      const count = signal<number>("count")
      const flag = signal<boolean>("flag")
      const object = signal<{ readonly id: number }>("object")
      const choices = signal<readonly string[]>("choices")
      const checks = signal<readonly boolean[]>("checks")
      const nodes = [
        <input data-bind={text} />,
        <input data-bind={count} />,
        <input
          type="number"
          data-bind={count}
        />,
        <input
          type="number"
          data-bind={text}
        />,
        <input
          type="checkbox"
          data-bind={flag}
        />,
        <input
          type="checkbox"
          value="selected"
          data-bind={text}
        />,
        <input
          type="checkbox"
          data-bind={checks}
        />,
        <input
          type="radio"
          data-bind={count}
        />,
        <input
          type="radio"
          data-bind={choices}
        />,
        <input data-bind="uncheckedInput" />,
        <input data-bind={mod(object, { prop: "customValue", event: "change" })} />,
        <typed-widget
          mode="compact"
          data-bind={object}
        />,
        // @ts-expect-error Standard input value adapters do not write objects.
        <input data-bind={object} />,
        // @ts-expect-error Number inputs do not write objects.
        <input
          type="number"
          data-bind={object}
        />,
        // @ts-expect-error Checkbox adapters write booleans or strings, not numbers.
        <input
          type="checkbox"
          data-bind={count}
        />,
        // @ts-expect-error Radio adapters write strings or numbers, not objects.
        <input
          type="radio"
          data-bind={object}
        />,
        // @ts-expect-error An event modifier does not replace the native value adapter.
        <input data-bind={mod(object, { event: "change" })} />
      ]

      void nodes
    })

    expect(true).toBe(true)
  })

  it("matches textarea bindings to string values", () => {
    typecheckOnly(() => {
      const text = signal<string>("text")
      const flag = signal<boolean>("flag")
      const nodes = [
        <textarea data-bind={text} />,
        <textarea data-bind={mod(flag, { prop: "checked", event: "change" })} />,
        // @ts-expect-error Textarea value binding writes strings, not booleans.
        <textarea data-bind={flag} />,
        // @ts-expect-error An event modifier does not change textarea value semantics.
        <textarea data-bind={mod(flag, { event: "change" })} />
      ]

      void nodes
    })

    expect(true).toBe(true)
  })

  it("matches select bindings to single and multiple selection values", () => {
    typecheckOnly(() => {
      const text = signal<string>("text")
      const count = signal<number>("count")
      const object = signal<{ readonly id: number }>("object")
      const strings = signal<readonly string[]>("strings")
      const numbers = signal<readonly number[]>("numbers")
      const selections = signal<readonly (string | number)[]>("selections")
      const nodes = [
        <select data-bind={text} />,
        <select data-bind={count} />,
        <select
          multiple
          data-bind={strings}
        />,
        <select
          multiple
          data-bind={numbers}
        />,
        <select
          multiple
          data-bind={selections}
        />,
        <select
          multiple
          data-bind="uncheckedSelection"
        />,
        <select
          multiple
          data-bind={mod(object, { prop: "customSelection" })}
        />,
        // @ts-expect-error Single selects write string or number values, not objects.
        <select data-bind={object} />,
        // @ts-expect-error Multiple selects write arrays, not scalar numbers.
        <select
          multiple
          data-bind={count}
        />
      ]

      void nodes
    })

    expect(true).toBe(true)
  })

  it("accepts only effect expressions at effect and lifecycle sites", () => {
    typecheckOnly(() => {
      const count = signal<number>("count")
      const effect = js<void>("$count++")
      const nodes = [
        <button data-on:click={effect} />,
        <div data-effect={effect} />,
        <div data-init={effect} />,
        <div data-on-intersect={effect} />,
        <div data-on-interval={effect} />,
        <div data-on-signal-patch={effect} />,
        <button data-on:click="$count++" />,
        // @ts-expect-error Effect sites reject readable expressions with no declared side effect.
        <div data-effect={count} />,
        // @ts-expect-error Lifecycle sites reject readable expressions with no declared side effect.
        <div data-init={count} />,
        // @ts-expect-error Intersect handlers require an effect expression.
        <div data-on-intersect={count} />,
        // @ts-expect-error Interval handlers require an effect expression.
        <div data-on-interval={count} />,
        // @ts-expect-error Signal-patch handlers require an effect expression.
        <div data-on-signal-patch={count} />,
        // @ts-expect-error Primitive values are not effect expressions.
        <button data-on:click={false} />,
        // @ts-expect-error Primitive values are not lifecycle effect expressions.
        <div data-init={0} />
      ]

      void nodes
    })

    expect(true).toBe(true)
  })

  it("keeps readable and truthy expressions distinct from effects", () => {
    typecheckOnly(() => {
      const message = signal<string>("message")
      const count = signal<number>("count")
      const effect = get("/refresh")
      const invalidClassCondition: DatastarAttributes = {
        // @ts-expect-error Class conditions require truthy expressions, not effects.
        "data-class:visible": effect
      }
      const nodes = [
        <output data-text={message} />,
        <output data-text={count} />,
        <div data-show={message} />,
        <div data-show={count} />,
        <div data-class:visible={message} />,
        <div data-class={{ visible: message, populated: count }} />,
        // @ts-expect-error Text content requires a readable expression, not an effect.
        <output data-text={effect} />,
        // @ts-expect-error Visibility requires a truthy expression, not an effect.
        <div data-show={effect} />,
        // @ts-expect-error Class maps reject effect expressions.
        <div data-class={{ visible: effect }} />
      ]

      void invalidClassCondition
      void nodes
    })

    expect(true).toBe(true)
  })

  it("types dynamic attributes and styles by their serialization semantics", () => {
    typecheckOnly(() => {
      const payload = signal<{ readonly id: number }>("payload")
      const opacity = signal<number>("opacity")
      const styles = signal<Readonly<Record<string, string | number>>>("styles")
      const symbolicText = signal<symbol>("symbolicText")
      const bigintAttribute = signal<bigint>("bigintAttribute")
      const effect = get("/refresh")
      const invalidStyleProperty: DatastarAttributes = {
        // @ts-expect-error CSS properties reject object-valued expressions.
        "data-style:opacity": payload
      }
      const invalidDynamicAttribute: DatastarAttributes = {
        // @ts-expect-error Dynamic attribute serialization cannot render bigints.
        "data-attr:data-id": bigintAttribute
      }
      const nodes = [
        <div data-attr={{ "data-payload": payload }} />,
        <div data-style={{ opacity, display: "'block'" }} />,
        <div data-style={styles} />,
        // @ts-expect-error Text interpolation cannot render symbols.
        <output data-text={symbolicText} />,
        // @ts-expect-error Dynamic attribute maps cannot serialize bigint values.
        <div data-attr={{ "data-id": bigintAttribute }} />,
        // @ts-expect-error CSS property expressions reject structured objects.
        <div data-style={{ opacity: payload }} />,
        // @ts-expect-error Dynamic attributes require readable values, not effects.
        <div data-attr={{ title: effect }} />,
        // @ts-expect-error Style maps require readable CSS values, not effects.
        <div data-style={{ opacity: effect }} />,
        // @ts-expect-error Whole style expressions must produce a style map.
        <div data-style={opacity} />
      ]

      void invalidStyleProperty
      void invalidDynamicAttribute
      void nodes
    })

    expect(true).toBe(true)
  })

  it("restricts signal initialization to structured signal values", () => {
    typecheckOnly(() => {
      const count = signal<number>("count")
      const effect = get("/refresh")
      const invalidKeyedSignal: DatastarAttributes = {
        // @ts-expect-error Signal initialization cannot store a void effect result.
        "data-signals:count": effect
      }
      const nodes = [
        <div data-signals={{ count, nested: { ready: true } }} />,
        <div data-signals={js<Readonly<Record<string, number>>>("{count: 1}")} />,
        <div data-signals:count={count} />,
        // @ts-expect-error Signal maps reject effect expressions as values.
        <div data-signals={{ count: effect }} />,
        // @ts-expect-error Whole data-signals expressions must produce a signal map.
        <div data-signals={count} />
      ]

      void invalidKeyedSignal
      void nodes
    })

    expect(true).toBe(true)
  })

  it("distinguishes computed values from computed maps", () => {
    typecheckOnly(() => {
      const count = signal<number>("count")
      const effect = get("/refresh")
      const nodes = [
        <div data-computed:double={js<number>`${count} * 2`} />,
        <div data-computed={{ double: js`() => ${count} * 2` }} />,
        <div data-computed="{double: () => $count * 2}" />,
        // @ts-expect-error Whole data-computed expressions must produce a computed map.
        <div data-computed={effect} />,
        // @ts-expect-error Computed-map leaves must be callable expressions.
        <div data-computed={{ double: count }} />,
        // @ts-expect-error Structured computed-map strings serialize as string values, not functions.
        <div data-computed={{ double: "() => $count * 2" }} />
      ]

      void nodes
    })

    expect(true).toBe(true)
  })

  it("restricts signal filters to static filter sources", () => {
    typecheckOnly(() => {
      const filter: DatastarSignalFilterInput = { include: "^public\\." }
      const filterSource = "{include: /^public\\./}"
      const expressionFilter = js<DatastarSignalFilterInput>(filterSource)
      const reactiveFilter = signal<DatastarSignalFilterInput>("filter")
      const effect = get("/refresh")
      const nodes = [
        <pre data-json-signals={filter} />,
        <div data-on-signal-patch-filter={filterSource} />,
        <div data-persist={filter} />,
        <div data-query-string={filterSource} />,
        // @ts-expect-error Static filters reject general expressions, even with a filter result type.
        <pre data-json-signals={expressionFilter} />,
        // @ts-expect-error Static filters cannot read a reactive filter signal.
        <pre data-json-signals={reactiveFilter} />,
        // @ts-expect-error Static patch filters cannot read a reactive filter signal.
        <div data-on-signal-patch-filter={reactiveFilter} />,
        // @ts-expect-error Static persistence filters cannot read a reactive filter signal.
        <div data-persist={reactiveFilter} />,
        // @ts-expect-error Static query-string filters cannot read a reactive filter signal.
        <div data-query-string={reactiveFilter} />,
        // @ts-expect-error JSON signal options reject effect expressions.
        <pre data-json-signals={effect} />,
        // @ts-expect-error Signal-patch filters reject effect expressions.
        <div data-on-signal-patch-filter={effect} />,
        // @ts-expect-error Persistence filters reject effect expressions.
        <div data-persist={effect} />,
        // @ts-expect-error Query-string filters reject effect expressions.
        <div data-query-string={effect} />
      ]

      void nodes
    })

    expect(true).toBe(true)
  })

  it("renders registered extensions and unregistered hyphenated custom elements", () => {
    const ready = signal<boolean, "ready">("ready")

    const nodes = [
      <div
        {...dataAttrs({ "data-rows": 3 })}
        hx-get="/fragment"
        x-data="{ open: false }"
      />,
      <typed-widget
        id="status"
        class="panel"
        aria-label="Status"
        mode="compact"
        count={2}
        data-show={ready}
        data-focus-when={ready}
      >
        Child
      </typed-widget>,
      <button data-focus-when={ready} />,
      <my-widget
        theme="dark"
        data-on:widget-loaded={js`${ready} = true`}
        data-rows={3}
        aria-roledescription="widget"
      >
        <svg
          viewBox="0 0 10 10"
          fill="none"
        >
          <circle
            cx={5}
            cy={5}
            r={4}
            data-show={ready}
          />
        </svg>
      </my-widget>
    ]

    expect(renderToString(nodes)).toBe(
      '<div data-rows="3" hx-get="/fragment" x-data="{ open: false }"></div>' +
        '<typed-widget id="status" class="panel" aria-label="Status" mode="compact" count="2" data-show="$ready" data-focus-when="$ready">Child</typed-widget>' +
        '<button data-focus-when="$ready"></button>' +
        '<my-widget theme="dark" data-on:widget-loaded="$ready = true" data-rows="3" aria-roledescription="widget">' +
        '<svg viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" data-show="$ready"></circle></svg>' +
        "</my-widget>"
    )
  })

  it("rejects mistyped tags, attributes, and event expressions at compile time", () => {
    const count = signal<number>("count")
    const invalidCustomObject: DatastarJsx.IntrinsicElements["div"] = {
      // @ts-expect-error rich ordinary custom attributes cannot be serialized at runtime
      "custom-object": { id: 1 }
    }
    const invalidCustomExpression: DatastarJsx.IntrinsicElements["div"] = {
      // @ts-expect-error expressions require a data-* attribute for runtime serialization
      "custom-expression": js`$count`
    }
    const invalidCustomElement: DatastarJsx.IntrinsicElements["typed-widget"] = {
      mode: "compact",
      // @ts-expect-error rich custom-element props cannot be serialized as HTML attributes
      payload: { id: 1 }
    }
    const invalidCustomModifier: DatastarJsx.IntrinsicElements["div"] = {
      // @ts-expect-error custom data attributes have no modifier metadata target
      "data-custom": mod("$count", { prevent: true })
    }
    void invalidCustomObject
    void invalidCustomExpression
    void invalidCustomElement
    void invalidCustomModifier

    const nodes = [
      <a
        // @ts-expect-error href must be a string
        href={42}
      />,
      <button
        // @ts-expect-error type must be a button type keyword
        type="anchor"
      />,
      // @ts-expect-error data-show does not accept regular expressions
      <div data-show={/pattern/} />,
      // @ts-expect-error data-bind expects a signal reference or name
      <input data-bind={42} />,
      // @ts-expect-error data-on values must be expressions, not objects
      <div data-on:click={{ handler: true }} />,
      // @ts-expect-error void elements accept no children
      <input type="text">text</input>,
      // @ts-expect-error unknown intrinsic names must use the custom-element hyphen convention
      <butotn tyep="sumbit" />,
      // @ts-expect-error href is not valid on div elements
      <div href="/not-valid-on-div" />,
      // @ts-expect-error input types must be valid keywords
      <input type="serach" />,
      // @ts-expect-error event handlers require effect expressions
      <button data-on:click={count} />,
      // @ts-expect-error registered plugin attributes use their exact expression type
      <button data-focus-when={count} />,
      // @ts-expect-error registered vendor attributes use their exact value type
      <div hx-get={42} />,
      // @ts-expect-error registered custom elements use their exact props
      <typed-widget mode="wide" />,
      // @ts-expect-error registered custom elements validate official Datastar attribute values
      <typed-widget
        mode="compact"
        data-show={/pattern/}
      />
    ]

    expect(nodes).toHaveLength(14)
  })

  it("renders per-attribute modifier combinations the runtime accepts", () => {
    const node = (
      <form
        data-signals={mod({ count: 0 }, { ifMissing: true })}
        data-on:submit={mod(get("/search"), { prevent: true })}
      >
        <input data-bind={mod("accepted", { prop: "checked", event: "change" })} />
      </form>
    )

    expect(renderToString(node)).toBe(
      '<form data-signals__ifmissing="{&quot;count&quot;: 0}" data-on:submit__prevent="@get(&quot;/search&quot;)">' +
        '<input data-bind__prop.checked__event.change="accepted"></form>'
    )
  })

  it("rejects incompatible modifier combinations at compile time", () => {
    typecheckOnly(() => {
      const nodes = [
        // @ts-expect-error unknown modifier keys are rejected by mod()
        <button data-on:click={mod(get("/save"), { prevent: true, nope: true })} />,
        // @ts-expect-error data-signals does not accept the prevent modifier
        <form data-signals={mod({ count: 0 }, { prevent: true })} />,
        // @ts-expect-error data-on events do not accept the ifMissing modifier
        <button data-on:click={mod(get("/save"), { ifMissing: true })} />,
        // @ts-expect-error data-bind does not accept timing modifiers
        <input data-bind={mod("accepted", { debounce: "200ms" })} />,
        // @ts-expect-error data-ignore only accepts the self modifier
        <div data-ignore={mod({ prevent: true })} />,
        // @ts-expect-error data-init does not accept event modifiers
        <div data-init={mod("$count = 1", { debounce: "500ms" })} />,
        // @ts-expect-error data-on-signal-patch does not accept viewTransition
        <div data-on-signal-patch={mod("console.log(patch)", { viewTransition: true })} />
      ]
      const customEventAttrs: DatastarAttributes = {
        // @ts-expect-error custom data-on events do not accept the ifMissing modifier
        "data-on:widget-loaded": mod(get("/save"), { ifMissing: true })
      }

      void nodes
      void customEventAttrs
    })

    expect(true).toBe(true)
  })
})
