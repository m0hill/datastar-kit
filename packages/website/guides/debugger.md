# Debugger

`datastar-kit/debugger` provides a small development-only debugger component built with the same TSX and Datastar attribute authoring model as the rest of Datastar Kit.

It renders ordinary HTML. There is no custom element to register and no separate client bundle to serve.

## Add it to a page

```tsx
import { reply } from "datastar-kit"
import { DatastarDebugger } from "datastar-kit/debugger"

const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"

export const page = () =>
  reply.page(
    <>
      <main>{/* your app */}</main>
      {process.env.NODE_ENV === "development" ? <DatastarDebugger /> : null}
    </>,
    {
      head: (
        <script
          type="module"
          src={DATASTAR_RUNTIME}
        />
      )
    }
  )
```

Do not ship the debugger in production pages. It mirrors browser-side signal state and records Datastar patch/fetch payloads for developer inspection. If you want to catch `data-init` fetches, render it early in the document body before the components that start those fetches.

## What it shows

The debugger has three simple views:

| View           | Shows                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Signals        | Current signal paths and values, excluding the debugger's own local signal.                                              |
| Signal patches | Real-time `datastar-signal-patch` payloads and affected paths.                                                           |
| Fetch/SSE      | Datastar `datastar-fetch` events such as `started`, `finished`, `datastar-patch-elements`, and `datastar-patch-signals`. |

The filter box applies to the current view using plain text matching.

## Props

| Prop                | Default                   | Use                                                                  |
| ------------------- | ------------------------- | -------------------------------------------------------------------- |
| `id`                | `"datastar-kit-debugger"` | Container id.                                                        |
| `stateName`         | `"_datastarKitDebugger"`  | Local root signal used by the debugger. Must be underscore-prefixed. |
| `open`              | `true`                    | Whether the `<details>` panel starts expanded.                       |
| `maxEvents`         | `50`                      | Maximum signal patch and fetch events retained in browser state.     |
| `title`             | `"Datastar debugger"`     | Summary title.                                                       |
| `class`/`className` | none                      | Additional container class.                                          |
| `style`             | none                      | Inline container style.                                              |

## Customizing

Because the debugger is just server-rendered HTML with Datastar attributes, you can copy it, style it, or use the exported state shape as a starting point:

```tsx
import type { DatastarDebuggerState } from "datastar-kit/debugger"
```

The component stores its UI state in one local signal. By default that signal is `_datastarKitDebugger`, so it is excluded from Datastar fetch payloads by Datastar's default underscore convention.

Next: [Testing](testing.md).
