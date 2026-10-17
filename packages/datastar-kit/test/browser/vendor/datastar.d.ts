// Types for the parts of the vendored Datastar bundle that the browser tests use.
export declare const getPath: (path: string) => unknown

export declare const action: (plugin: {
  readonly name: string
  readonly apply: (context: unknown, ...args: readonly unknown[]) => unknown
}) => void
