# Debugger

`datastar-kit/debugger` provides a development-only Web Component for inspecting Datastar pages.

The debugger runs in browser JavaScript, renders its UI in Shadow DOM, and keeps recorded data out of your application signals. Do not load it in production: events and timeline snapshots may contain sensitive page data.

## Add it to development pages

Load the debugger from a browser entrypoint that your application includes only in development:

```ts
// browser-development.ts
import "datastar-kit/debugger"
```

The import registers and adds a collapsed debugger with bounded history. How the development entrypoint is selected is up to your application or build tool; keep it out of production builds and pages.

For a server-rendered page without an application bundle, copy the built `datastar-kit/debugger` browser file to your development assets and load it before Datastar:

```html
<script
  type="module"
  src="/__dev/datastar-kit-debugger.js"
></script>
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"
></script>
```

For custom settings, add an element before loading the debugger script:

```html
<datastar-kit-debugger
  open
  max-events="200"
  max-snapshots="50"
></datastar-kit-debugger>
```

A pinned CDN package can also provide the debugger during development:

```html
<script
  type="module"
  src="https://esm.sh/datastar-kit@x.y.z/debugger"
></script>
```

Replace `x.y.z` with the exact package version you use.

## What it shows

- **Signals** shows the current browser signal snapshot as searchable JSON.
- **Events** records signal patches and Datastar fetch activity, newest first.
- **Timeline** records page HTML and signal snapshots. Moving the slider restores an earlier snapshot and pauses recording until you return to Live.

Plain search text is case-insensitive. A value such as `/user.*email/i` uses a regular expression. Pause stops event and snapshot recording. Clear removes the history for the selected tab.

## Element attributes

| Attribute       | Default | Use                                   |
| --------------- | ------- | ------------------------------------- |
| `open`          | absent  | Add it to start with the panel open.  |
| `max-events`    | `100`   | Maximum events retained in memory.    |
| `max-snapshots` | `50`    | Maximum snapshots retained in memory. |

Only one debugger element should be connected to a page.

## Time travel limitations

Time travel is a best-effort development aid. It restores body HTML and Datastar signals, not the complete browser process.

Restoring a snapshot can restart `data-init` requests or streams. It cannot restore imperative event listeners, focus, scroll position, canvas or media state, or state held by third-party widgets. Computed signals may also update the restored page immediately.

Next: [Testing](testing.md).
