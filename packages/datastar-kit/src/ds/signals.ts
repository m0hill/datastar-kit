import type { SignalValue } from "../types.js"
import { ExprBase, type Expr } from "./expression.js"

declare const signalTargetValue: unique symbol

/**
 * A typed signal reference that can receive values from a mutating Datastar attribute.
 *
 * @typeParam T Value that may be written to the signal.
 */
export interface SignalTarget<in T = never> {
  /** Contravariant phantom marker for values this signal can receive. */
  readonly [signalTargetValue]: (value: T) => void
}

/**
 * Authoring-time signal value accepted by Datastar authoring helpers.
 *
 * @remarks
 * This type can contain `Expr` values because it is rendered into Datastar client-side expression
 * source. Use `SignalValue` for strict runtime signal data that crosses the protocol boundary.
 */
export type SignalValueInput =
  | SignalValue
  | undefined
  | Expr<SignalValue | undefined>
  | readonly SignalValueInput[]
  | { readonly [key: string]: SignalValueInput }

/**
 * Authoring-time signal object accepted by `data-signals` JSX attributes and fetch action payload
 * overrides.
 */
export type SignalStateInput = Readonly<Record<string, SignalValueInput>>

/**
 * Error thrown when a signal name cannot be represented by Datastar Kit helpers.
 */
export class SignalNameError extends Error {
  constructor(readonly signalName: string) {
    super(`Invalid Datastar signal name: ${JSON.stringify(signalName)}`)
  }
}

const signalNamePattern = /^_?[A-Za-z][A-Za-z0-9_]*(\._?[A-Za-z][A-Za-z0-9_]*)*$/

export const assertSignalName = (name: string): void => {
  if (!signalNamePattern.test(name)) {
    throw new SignalNameError(name)
  }
}

/**
 * A typed reference to a Datastar signal.
 *
 * @typeParam T Runtime value stored at this signal path.
 * @typeParam Name Signal path represented by this reference.
 */
export class Signal<T, Name extends string = string>
  extends ExprBase<T>
  implements SignalTarget<T>
{
  declare readonly [signalTargetValue]: (value: T) => void

  constructor(readonly name: Name) {
    super()
    assertSignalName(name)
  }

  toDatastarExpression(): string {
    return `$${this.name}`
  }

  /** Creates a typed child signal reference below this signal path. */
  path<Key extends keyof NonNullable<T> & string>(
    key: Key
  ): Signal<NonNullable<T>[Key], `${Name}.${Key}`> {
    return new Signal(`${this.name}.${key}`)
  }
}

/**
 * Creates a typed Datastar signal reference.
 *
 * @throws {@link SignalNameError} When the signal name is invalid.
 */
export const signal = <T = unknown, Name extends string = string>(name: Name): Signal<T, Name> =>
  new Signal(name)

/**
 * Creates an underscore-prefixed Datastar signal reference.
 *
 * @remarks
 * Datastar does not include underscore-prefixed signals in backend requests by default. This helper
 * is named `local` for UI-local signal state; it is unrelated to browser `localStorage`.
 *
 * @throws {@link SignalNameError} When the signal name is invalid.
 * @see https://data-star.dev/reference/attributes#data-signals
 */
export const local = <T = unknown, Name extends string = string>(
  name: Name
): Signal<T, Name extends `_${string}` ? Name : `_${Name}`> =>
  signal<T, Name extends `_${string}` ? Name : `_${Name}`>(
    // SAFETY: names that already start with "_" pass through and others gain the prefix, which is
    // exactly the conditional type; TypeScript cannot evaluate it for a generic Name.
    (name.startsWith("_") ? name : `_${name}`) as Name extends `_${string}` ? Name : `_${Name}`
  )

/**
 * A typed reference to a signal defined with `data-computed`. It reads like any signal, but it is
 * not a {@link SignalTarget}: Datastar ignores writes to a computed signal, so attributes that
 * write, such as `data-bind`, reject it.
 *
 * @typeParam T Value the computed expression produces.
 * @typeParam Name Signal path represented by this reference.
 */
export type Computed<T, Name extends string = string> = Expr<T> & { readonly name: Name }

/**
 * Creates a read-only reference to a computed signal, which `data-computed:<name>` defines.
 *
 * @example
 * ```tsx
 * const total = computed<number>("total")
 *
 * <div data-computed:total={js`${price} * ${qty}`}>
 *   <output data-text={total} />
 * </div>
 * ```
 *
 * @throws {@link SignalNameError} When the signal name is invalid.
 * @see https://data-star.dev/reference/attributes#data-computed
 */
export const computed = <T = unknown, Name extends string = string>(
  name: Name
): Computed<T, Name> => signal<T, Name>(name)
