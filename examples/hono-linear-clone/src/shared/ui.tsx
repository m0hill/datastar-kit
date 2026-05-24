import type { HtmlChild } from "datastar-kit"
import { ds } from "datastar-kit"
import { z } from "zod"

export const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export const pageHead = [
  <meta name="viewport" content="width=device-width, initial-scale=1" />,
  <link rel="preconnect" href="https://fonts.googleapis.com" />,
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />,
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />,
  <link href="/public/styles.css" rel="stylesheet" />,
  <script type="module" src={DATASTAR_RUNTIME} />
]

export const Empty = (props: { children: HtmlChild }) => (
  <p class="text-fg-muted text-[13px]">{props.children}</p>
)

export const FieldError = (props: { path: Parameters<typeof ds.text>[0] }) => (
  <small class="text-danger text-[13px] font-medium min-h-4" {...ds.text(props.path)}></small>
)

export const firstErrors = (error: z.ZodError) => {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>
  return {
    field: (name: string) => fieldErrors[name]?.[0] ?? ""
  }
}

export const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string" &&
  error.code.includes("CONSTRAINT")
