import * as Schema from "effect/Schema"
import { dataSignals, signal, type DatastarObject, type SignalRecord } from "./ds.js"
import type { Props } from "./html.js"

type PatchValue<T> = T extends readonly (infer Item)[]
  ? readonly PatchValue<Item>[] | null
  : T extends object
    ? { readonly [Key in keyof T]?: PatchValue<T[Key]> } | null
    : T | null

type SignalPatch<Shape extends DatastarObject> = {
  readonly [Key in keyof Shape]?: PatchValue<Shape[Key]>
}

const signalRefs = <Shape extends DatastarObject>(): SignalRecord<Shape> =>
  new Proxy(
    {},
    {
      get: (_target, property) => typeof property === "string" ? signal<never, string>(property) : undefined
    }
  ) as SignalRecord<Shape>

export interface SignalContract<Shape extends DatastarObject, R = never> {
  readonly schema: Schema.Decoder<Shape, R>
  readonly $: SignalRecord<Shape>
  readonly initial: (values: Shape, options?: { readonly ifMissing?: boolean }) => Props
  readonly patch: (values: SignalPatch<Shape>) => SignalPatch<Shape>
}

export type PatchOf<Contract> = Contract extends SignalContract<infer Shape, infer _R> ? SignalPatch<Shape> : never

export const signals = <Shape extends DatastarObject, R>(schema: Schema.Decoder<Shape, R>): SignalContract<Shape, R> => ({
  schema,
  $: signalRefs<Shape>(),
  initial: (values, options) => dataSignals(values, options),
  patch: (values) => values
})
