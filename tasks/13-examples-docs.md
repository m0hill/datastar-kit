# T013 — Build reference examples and documentation

## Status

`pending`

## Why this task exists

Examples define a framework’s real programming model more strongly than API docs. The current examples are useful, but they mostly demonstrate low-level helper usage.

To become a real framework, `ts-star` needs examples that teach the intended architecture: backend state, commands, live queries, validation, and Effect services.

## Target outcome

Create reference examples and docs that show how to build real applications without recreating frontend complexity.

## Required examples

### 1. Backend-state counter

Should avoid teaching `count` as long-term client signal state. Show:

- backend state/service;
- command to increment;
- element patch or live query rerender;
- optional local loading indicator.

### 2. Search/filter page

Current search is a good start. Expand to show:

- query schema;
- URL/query behavior;
- direct HTML patch;
- debounce;
- empty/error states.

### 3. Form with validation

Show:

- input signals;
- Effect Schema decode;
- validation errors;
- error patches/signals;
- success path with server-rendered updated state.

### 4. Live query example

Could be live counter, todo list, dashboard, or chat. It should show:

- command routes mutate backend state;
- live query renders current state;
- reconnect recovers current view;
- heartbeat/cancellation behavior.

### 5. Security/session sketch

Not a full auth framework, but show CSRF/session integration points.

## Documentation pages

- Architecture overview.
- Datastar philosophy in `ts-star`.
- Signals guide.
- Actions/commands guide.
- Realtime/live query guide.
- Error and validation guide.
- Effect services/layers guide.
- Deployment guide.
- API reference.

## Implementation work

- Rewrite examples after foundational APIs settle.
- Make examples typechecked and tested.
- Add browser integration tests for at least one reference example.
- Keep examples small but realistic.
- Avoid examples that encourage patching client signals as primary state.

## Acceptance criteria

- A new user can follow examples and build in the intended model.
- Docs explain why the framework avoids React-style complexity.
- Every major framework concept has one tested example.
- Examples run through package scripts.
- README points to the correct docs and examples.

## Anti-goals

- Do not write docs for APIs that are not designed yet.
- Do not add many toy examples that duplicate the same pattern.
- Do not hide Datastar concepts; users should still understand the underlying tool.
