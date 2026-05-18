# T007 — Establish the signal policy and scoping model

## Status

`done`

## Why this task exists

Datastar signals are powerful and convenient. They are also the easiest way for `ts-star` to drift into client-side state management.

The framework needs a firm signal philosophy before adding higher-level APIs.

## Target outcome

Signals should be treated as:

- user input state;
- local UI state;
- loading/indicator state;
- validation/error state;
- small ephemeral browser state;
- data sent to the backend for a command.

Signals should not be the primary application database or client-side model layer.

## Recommended policy

### Backend source of truth

Persistent/domain state lives on the server. The browser may hold temporary copies, but reconnecting or rerendering from backend state should restore the UI.

### Use `__ifmissing` for client-owned initial state

If a signal is initialized from markup but should not overwrite user edits during morphs, use `ifMissing`.

### Use local/private signals intentionally

Datastar excludes signals beginning with `_` from default backend requests. Provide helpers and conventions for:

- private browser-only state;
- instance-scoped local state;
- validation state that should or should not be posted.

### Avoid broad signal patches for app state

Patching signals is useful for validation errors, form reset, local flags, and small UI state. For primary app state, prefer element patches from server-rendered state.

## Implementation work

- Write `docs/signals.md`.
- Add helper names that encode intent, e.g. `localSignal`, `privateSignal`, `inputSignal`, or similar.
- Make examples use signals sparingly.
- Consider schema-derived signal groups from T005.
- Add docs for nested signals and naming/casing.
- Add warnings around sensitive data in signals.

## Examples to rewrite or add

- Counter with backend state + element patch or live query, not just signal patch.
- Form with input signals and server-side validation patches.
- Disclosure/menu using local private signal.
- Loading indicator with `data-indicator`.

## Acceptance criteria

- The docs clearly say when **not** to use signals.
- The default examples do not teach app state as client signal state.
- Helpers make local/private intent visible.
- Sensitive data warning exists.
- Signal names and casing behavior are tested.

## Anti-goals

- Do not forbid signals.
- Do not wrap Datastar signals so heavily that users cannot use documented Datastar patterns.
- Do not build a frontend store API.
