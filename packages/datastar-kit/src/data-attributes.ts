import type { HtmlPropValue } from "./html.js"

/** Primitive custom `data-*` attributes that can be spread onto a JSX intrinsic element. */
export type DataAttributes = Readonly<Record<`data-${string}`, HtmlPropValue>>

type OnlyDataAttributes<Attributes> =
  Exclude<keyof Attributes, `data-${string}`> extends never ? Attributes : never

/**
 * Type-checks arbitrary custom `data-*` attributes without weakening direct JSX attribute names.
 *
 * Custom Datastar plugins that accept expressions or structured values should instead register an
 * exact attribute through `CustomJsxAttributes` in `datastar-kit/jsx-runtime`.
 *
 * @param attributes Primitive custom data attributes.
 * @returns The unchanged attributes for spreading onto an intrinsic element.
 */
export const dataAttrs = <const Attributes extends Readonly<Record<string, HtmlPropValue>>>(
  attributes: OnlyDataAttributes<Attributes>
): Attributes => attributes
