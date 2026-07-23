import type { HtmlPropValue } from "../html.js"
import type { Expr } from "./expression.js"
import type { DatastarModifierKeysFor } from "./modifier-rendering.js"
import type { DatastarModifiedValue, DatastarModifierKey } from "./modifiers.js"
import type { SignalStateInput, SignalTarget, SignalValueInput } from "./signals.js"

/**
 * Unclassified Datastar expression source retained for compatibility.
 *
 * @deprecated Prefer the semantic expression type for the target attribute. This broad type erases
 * the expression result and should be treated as an unsafe interoperability escape hatch.
 */
export type DatastarExpression = Expr | string

/** JavaScript value that can be read from a Datastar expression without being an effect result. */
export type DatastarReadableValue =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | object
  | null
  | undefined

/**
 * Readable expression accepted by value-rendering attributes such as `data-text`.
 *
 * Raw strings and literal primitives remain explicit authoring escape hatches. Typed effect helpers
 * that produce `void` are rejected.
 */
export type DatastarReadableExpression =
  | Expr<DatastarReadableValue>
  | string
  | number
  | boolean
  | null

/**
 * Expression evaluated for JavaScript truthiness by visibility and class attributes.
 *
 * String and number signals are intentionally supported because Datastar uses normal JavaScript
 * truthiness rather than requiring a literal boolean result.
 */
export type DatastarTruthyExpression = DatastarReadableExpression

/**
 * Legacy readable expression union retained for compatibility.
 *
 * @deprecated Prefer the semantic expression type for the target attribute, such as
 * {@link DatastarReadableExpression}, {@link DatastarTruthyExpression}, or
 * {@link DatastarEffectExpression}.
 */
export type DatastarExpressionValue = DatastarReadableExpression

/**
 * Side-effecting expression accepted by Datastar event and lifecycle attributes.
 *
 * Typed helpers must produce `void`. A raw string remains an explicit escape hatch for hand-written
 * Datastar expression source.
 */
export type DatastarEffectExpression = Expr<void> | string

/** JavaScript value that Datastar can interpolate into text content. */
export type DatastarTextValue = string | number | boolean | bigint | object | null | undefined

/** Readable expression used to set text content without unsafe symbol interpolation. */
export type DatastarTextExpression = Expr<DatastarTextValue> | string | number | boolean | null

/** JavaScript value that Datastar can serialize into a dynamic HTML attribute. */
export type DatastarDynamicAttributeValue = string | number | boolean | object | null | undefined

/** Readable expression used to set a dynamic HTML attribute value. */
export type DatastarAttributeExpression =
  | Expr<DatastarDynamicAttributeValue>
  | string
  | number
  | boolean
  | null

/** JavaScript value that Datastar can apply to an inline CSS property. */
export type DatastarStyleValue = string | number | boolean | null | undefined

/** Readable expression used to set one inline CSS property. */
export type DatastarStyleExpression = Expr<DatastarStyleValue> | string | number | boolean | null

/**
 * An attribute value optionally wrapped with `mod(value, modifiers)`, restricted to the modifier
 * keys the attribute accepts.
 */
export type DatastarModifiable<Value, Keys extends DatastarModifierKey = DatastarModifierKey> =
  | Value
  | DatastarModifiedValue<Value, Keys>

type DatastarBindModifierKey = DatastarModifierKeysFor<"bind">
type DatastarBindKeyModifierKey = DatastarModifierKeysFor<"bindKey">
type DatastarCaseModifierKey = DatastarModifierKeysFor<"case">
type DatastarComputedModifierKey = DatastarModifierKeysFor<"computed">
type DatastarIgnoreModifierKey = DatastarModifierKeysFor<"ignore">
type DatastarInitModifierKey = DatastarModifierKeysFor<"init">
type DatastarIntersectModifierKey = DatastarModifierKeysFor<"intersect">
type DatastarIntervalModifierKey = DatastarModifierKeysFor<"interval">
type DatastarJsonSignalsModifierKey = DatastarModifierKeysFor<"jsonSignals">
type DatastarOnModifierKey = DatastarModifierKeysFor<"on">
type DatastarSignalPatchModifierKey = DatastarModifierKeysFor<"signalPatch">
type DatastarSignalsModifierKey = DatastarModifierKeysFor<"signals">
type DatastarSignalsKeyModifierKey = DatastarModifierKeysFor<"signalsKey">

/**
 * Value accepted by presence-style Datastar attributes such as `data-ignore`.
 *
 * `true` renders the bare attribute, `false`, `null`, and `undefined` omit it, and strings are
 * kept raw for hand-authored values.
 */
export type DatastarPresenceValue = string | boolean | null

type DatastarComputedFunction = () => DatastarReadableValue

type DatastarComputedResult = {
  readonly [key: string]: DatastarComputedFunction | DatastarComputedResult
}

type DatastarComputedInputMap = {
  readonly [key: string]: Expr<DatastarComputedFunction> | DatastarComputedInputMap
}

/**
 * Callable expression map accepted by the object form of `data-computed`.
 *
 * A raw string may describe the entire object expression. Structured authoring requires every leaf
 * to evaluate to a function because Datastar wraps those functions as computed signals.
 */
export type DatastarComputedInput = string | Expr<DatastarComputedResult> | DatastarComputedInputMap

/**
 * A readable and writable typed signal reference accepted by two-way binding attributes.
 *
 * The default broad read and write bounds encode a signal of some value type while preserving both
 * capabilities. Mutation-only attributes use a precise {@link SignalTarget} type instead.
 *
 * @typeParam ReadValue Value callers may read from the signal.
 * @typeParam WriteValue Value Datastar may write to the signal.
 */
export interface DatastarSignalReference<out ReadValue = unknown, in WriteValue = never>
  extends Expr<ReadValue>, SignalTarget<WriteValue> {
  /** Dotted signal path rendered as the attribute value. */
  readonly name: string
}

/**
 * Signal filter accepted by filter-valued Datastar attributes such as `data-json-signals` and
 * `data-on-signal-patch-filter`.
 */
export type DatastarSignalFilterInput = {
  /** Regular expression or expression selecting signal paths to include. */
  readonly include?: Expr<RegExp> | RegExp | string | undefined
  /** Regular expression or expression selecting signal paths to exclude. */
  readonly exclude?: Expr<RegExp> | RegExp | string | undefined
}

/**
 * Serializable Datastar value union used by loose JSX and SVG prop bags.
 *
 * Known intrinsic elements type Datastar attributes precisely. Custom plugins on known elements
 * should register an exact attribute through `CustomJsxAttributes`.
 */
export type DatastarAttributeValue =
  | HtmlPropValue
  | Expr
  | SignalTarget
  | DatastarModifiedValue
  | RegExp
  | readonly DatastarAttributeValue[]
  | { readonly [key: string]: DatastarAttributeValue }

/**
 * DOM event names suggested for `data-on:` attributes.
 *
 * Any other event name (custom events included) is still accepted through the `data-on:` template
 * attribute signature.
 */
export type DatastarEventName =
  | "abort"
  | "animationcancel"
  | "animationend"
  | "animationiteration"
  | "animationstart"
  | "auxclick"
  | "beforeinput"
  | "beforetoggle"
  | "blur"
  | "cancel"
  | "canplay"
  | "canplaythrough"
  | "change"
  | "click"
  | "close"
  | "compositionend"
  | "compositionstart"
  | "compositionupdate"
  | "contextmenu"
  | "copy"
  | "cut"
  | "datastar-fetch"
  | "dblclick"
  | "drag"
  | "dragend"
  | "dragenter"
  | "dragleave"
  | "dragover"
  | "dragstart"
  | "drop"
  | "durationchange"
  | "emptied"
  | "ended"
  | "error"
  | "focus"
  | "focusin"
  | "focusout"
  | "input"
  | "invalid"
  | "keydown"
  | "keypress"
  | "keyup"
  | "load"
  | "loadeddata"
  | "loadedmetadata"
  | "loadstart"
  | "mousedown"
  | "mouseenter"
  | "mouseleave"
  | "mousemove"
  | "mouseout"
  | "mouseover"
  | "mouseup"
  | "paste"
  | "pause"
  | "play"
  | "playing"
  | "pointercancel"
  | "pointerdown"
  | "pointerenter"
  | "pointerleave"
  | "pointermove"
  | "pointerout"
  | "pointerover"
  | "pointerup"
  | "progress"
  | "ratechange"
  | "reset"
  | "resize"
  | "scroll"
  | "scrollend"
  | "seeked"
  | "seeking"
  | "select"
  | "selectionchange"
  | "slotchange"
  | "stalled"
  | "submit"
  | "suspend"
  | "timeupdate"
  | "toggle"
  | "touchcancel"
  | "touchend"
  | "touchmove"
  | "touchstart"
  | "transitioncancel"
  | "transitionend"
  | "transitionrun"
  | "transitionstart"
  | "volumechange"
  | "waiting"
  | "wheel"

/**
 * Named `data-on:` attributes generated from {@link DatastarEventName} so common events appear in
 * editor autocomplete.
 */
export type DatastarEventAttributes = {
  [Event in DatastarEventName as `data-on:${Event}`]?:
    | DatastarModifiable<DatastarEffectExpression, DatastarOnModifierKey>
    | undefined
}

/**
 * Datastar attributes accepted by every intrinsic JSX element.
 *
 * Exact attributes are typed with their precise value shapes, and keyed attributes (`data-on:*`,
 * `data-signals:*`, ...) are typed through template signatures. Custom rich `data-*` attributes
 * must be registered through `CustomJsxAttributes`; primitive dataset bags can use `dataAttrs`.
 *
 * @typeParam RefElement Element value written by `data-ref`; defaults to an unconstrained target
 * when no intrinsic-element context is available.
 * @see https://data-star.dev/reference/attributes
 */
export interface DatastarAttributes<RefElement = never> extends DatastarEventAttributes {
  /** Sets attributes from an object of attribute names to expressions. @see https://data-star.dev/reference/attributes#data-attr */
  "data-attr"?:
    | Readonly<Record<string, DatastarAttributeExpression>>
    | Expr<Readonly<Record<string, DatastarDynamicAttributeValue>>>
    | string
    | undefined
  /** Two-way binds an element value to a signal. @see https://data-star.dev/reference/attributes#data-bind */
  "data-bind"?:
    | DatastarModifiable<DatastarSignalReference | string, DatastarBindModifierKey>
    | null
    | undefined
  /** Toggles classes from an object of class names to truthy expressions. @see https://data-star.dev/reference/attributes#data-class */
  "data-class"?:
    | Readonly<Record<string, DatastarTruthyExpression>>
    | Expr<Readonly<Record<string, DatastarReadableValue>>>
    | string
    | undefined
  /** Creates read-only computed signals. @see https://data-star.dev/reference/attributes#data-computed */
  "data-computed"?: DatastarComputedInput | undefined
  /** Runs an expression whenever its signal dependencies change. @see https://data-star.dev/reference/attributes#data-effect */
  "data-effect"?: DatastarEffectExpression | undefined
  /** Skips Datastar processing for this element and its descendants. @see https://data-star.dev/reference/attributes#data-ignore */
  "data-ignore"?: DatastarModifiable<DatastarPresenceValue, DatastarIgnoreModifierKey> | undefined
  /** Preserves this element when morphing. @see https://data-star.dev/reference/attributes#data-ignore-morph */
  "data-ignore-morph"?: DatastarPresenceValue | undefined
  /** Tracks in-flight fetch requests in a boolean signal. @see https://data-star.dev/reference/attributes#data-indicator */
  "data-indicator"?: SignalTarget<boolean> | string | null | undefined
  /** Runs an expression when the element is initialized. @see https://data-star.dev/reference/attributes#data-init */
  "data-init"?: DatastarModifiable<DatastarEffectExpression, DatastarInitModifierKey> | undefined
  /** Renders matching signals as JSON text content. @see https://data-star.dev/reference/attributes#data-json-signals */
  "data-json-signals"?:
    | DatastarModifiable<
        boolean | null | DatastarSignalFilterInput | string,
        DatastarJsonSignalsModifierKey
      >
    | undefined
  /** Runs an expression when the element intersects the viewport. @see https://data-star.dev/reference/attributes#data-on-intersect */
  "data-on-intersect"?:
    | DatastarModifiable<DatastarEffectExpression, DatastarIntersectModifierKey>
    | undefined
  /** Runs an expression on a timed interval. @see https://data-star.dev/reference/attributes#data-on-interval */
  "data-on-interval"?:
    | DatastarModifiable<DatastarEffectExpression, DatastarIntervalModifierKey>
    | undefined
  /** Runs an expression when signals are patched. @see https://data-star.dev/reference/attributes#data-on-signal-patch */
  "data-on-signal-patch"?:
    | DatastarModifiable<DatastarEffectExpression, DatastarSignalPatchModifierKey>
    | undefined
  /** Filters which signal patches trigger `data-on-signal-patch`. @see https://data-star.dev/reference/attributes#data-on-signal-patch-filter */
  "data-on-signal-patch-filter"?: DatastarSignalFilterInput | string | null | undefined
  /** Persists matching signals in web storage. @see https://data-star.dev/reference/attributes#data-persist */
  "data-persist"?: boolean | null | DatastarSignalFilterInput | string | undefined
  /** Preserves listed attribute values when morphing. @see https://data-star.dev/reference/attributes#data-preserve-attr */
  "data-preserve-attr"?: string | null | undefined
  /** Syncs matching signals with the URL query string. @see https://data-star.dev/reference/attributes#data-query-string */
  "data-query-string"?: boolean | null | DatastarSignalFilterInput | string | undefined
  /** Stores a reference to this element in a signal. @see https://data-star.dev/reference/attributes#data-ref */
  "data-ref"?: SignalTarget<RefElement> | string | null | undefined
  /** Scopes signals to this element's descendants. @see https://data-star.dev/reference/attributes#data-scope-children */
  "data-scope-children"?: DatastarPresenceValue | undefined
  /** Scrolls the element into view. @see https://data-star.dev/reference/attributes#data-scroll-into-view */
  "data-scroll-into-view"?: DatastarPresenceValue | undefined
  /** Shows or hides the element based on expression truthiness. @see https://data-star.dev/reference/attributes#data-show */
  "data-show"?: DatastarTruthyExpression | undefined
  /** Patches signals from structured signal defaults. @see https://data-star.dev/reference/attributes#data-signals */
  "data-signals"?:
    | DatastarModifiable<
        SignalStateInput | Expr<SignalStateInput> | string,
        DatastarSignalsModifierKey
      >
    | undefined
  /** Sets inline styles from an object of style properties to expressions. @see https://data-star.dev/reference/attributes#data-style */
  "data-style"?:
    | Readonly<Record<string, DatastarStyleExpression>>
    | Expr<Readonly<Record<string, DatastarStyleValue>>>
    | string
    | undefined
  /** Sets text content from an interpolatable expression. @see https://data-star.dev/reference/attributes#data-text */
  "data-text"?: DatastarTextExpression | undefined

  /** Sets a single attribute from an expression, e.g. `data-attr:disabled`. */
  [name: `data-attr:${string}`]: DatastarAttributeExpression | undefined
  /** Two-way binds an element value to the signal named by the attribute key, e.g. `data-bind:value`. */
  [name: `data-bind:${string}`]:
    | DatastarModifiable<boolean | null, DatastarBindKeyModifierKey>
    | undefined
  /** Toggles a single class from a truthy expression, e.g. `data-class:hidden`. */
  [name: `data-class:${string}`]:
    | DatastarModifiable<DatastarTruthyExpression, DatastarCaseModifierKey>
    | undefined
  /** Creates a read-only computed signal named by the attribute key. */
  [name: `data-computed:${string}`]:
    | DatastarModifiable<DatastarReadableExpression, DatastarComputedModifierKey>
    | undefined
  /** Tracks in-flight fetch requests in the signal named by the attribute key. */
  [name: `data-indicator:${string}`]:
    | DatastarModifiable<boolean | null, DatastarCaseModifierKey>
    | undefined
  /** Runs an expression when the named event fires, e.g. `data-on:click`. */
  [name: `data-on:${string}`]:
    | DatastarModifiable<DatastarEffectExpression, DatastarOnModifierKey>
    | undefined
  /** Persists matching signals under the storage key named by the attribute key. */
  [name: `data-persist:${string}`]: boolean | null | DatastarSignalFilterInput | undefined
  /** Stores a reference to this element in the signal named by the attribute key. */
  [name: `data-ref:${string}`]:
    | DatastarModifiable<boolean | null, DatastarCaseModifierKey>
    | undefined
  /** Patches the signal named by the attribute key, e.g. `data-signals:count`. */
  [name: `data-signals:${string}`]:
    | DatastarModifiable<SignalValueInput, DatastarSignalsKeyModifierKey>
    | undefined
  /** Sets a single style property from an expression, e.g. `data-style:opacity`. */
  [name: `data-style:${string}`]: DatastarStyleExpression | undefined
}
