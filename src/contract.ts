import * as Schema from "effect/Schema"
import { dataSignals, signals as signalRefs, type SignalRecord } from "./datastar.js"
import type { Props } from "./html.js"
import type { JsonObject } from "./sse.js"

type PatchValue<T> = T extends readonly (infer Item)[]
  ? readonly PatchValue<Item>[] | null
  : T extends object
    ? { readonly [Key in keyof T]?: PatchValue<T[Key]> } | null
    : T | null

type SignalPatch<Shape extends object> = {
  readonly [Key in keyof Shape]?: PatchValue<Shape[Key]>
}

export interface Signals<Shape extends object, R = never> {
  readonly schema: Schema.Decoder<Shape, R>
  readonly $: SignalRecord<Shape>
  readonly initial: (values: Shape, options?: { readonly ifMissing?: boolean }) => Props
  readonly patch: (values: SignalPatch<Shape>) => SignalPatch<Shape>
}

export type Patch<Contract> = Contract extends Signals<infer Shape, any> ? SignalPatch<Shape> : never

export const signals = <Shape extends object, R>(schema: Schema.Decoder<Shape, R>): Signals<Shape, R> => ({
  schema,
  $: signalRefs<Shape>(),
  initial: (values, options) => dataSignals(values as JsonObject, options),
  patch: (values) => values
})
