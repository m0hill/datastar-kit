// Types for the parts of the vendored Datastar bundles that the browser tests use. Each browser
// test project aliases `datastar-runtime` to one bundle in `vendor/` (see vitest.config.ts).
declare module "datastar-runtime" {
  export const getPath: (path: string) => unknown

  export const action: (plugin: {
    readonly name: string
    readonly apply: (context: unknown, ...args: readonly unknown[]) => unknown
  }) => void
}

/** Datastar version of the bundle the current browser test project runs against. */
declare const __DATASTAR_VERSION__: string
