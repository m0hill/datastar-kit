import type { Expr } from "datastar-kit"

declare module "datastar-kit/jsx-runtime" {
  interface CustomJsxAttributes {
    "data-alert"?: Expr<string>
  }
}
