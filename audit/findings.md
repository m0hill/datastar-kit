# Findings

## F-001: Standalone signal initialization leaks signal names

- Issue: Examples initialize standalone signals with `ds.dataSignal(signal.name, value)`, so callers have to pull the name out of the signal ref.
- Module: `ds` signal authoring.
- Interface cost: Callers must know that a `Signal` stores a public `.name` and that `dataSignal` only accepts strings.
- Resolution: Pending.

## F-002: Common signal mutations require inline JavaScript strings

- Issue: Examples repeat assignment and sequencing expressions such as `${signal} = false`, `@put(...); ${signal} = false`, and guarded requests.
- Module: `ds` expression/action authoring.
- Interface cost: Callers hand-format JavaScript for common Datastar signal mutations.
- Resolution: Pending.

## F-003: `reply.stream()` accepts an unused wrapper chunk

- Issue: `SseChunk` and `{ content }` inputs are only used by one test and no examples or docs.
- Module: `reply` stream response.
- Interface cost: The stream Interface has an extra shape callers can learn without gaining Depth.
- Resolution: Pending.

## F-004: `ds.queryUrl()` appends query parameters after URL hashes

- Issue: `queryUrl("/items#results", { q })` currently produces a query string after `#results`, which makes it part of the fragment instead of the URL query.
- Module: `ds` action URL authoring.
- Interface cost: Callers cannot safely pass normal URL strings with fragments.
- Resolution: Pending.

## F-005: Script-event attributes bypass HTML name validation

- Issue: `executeScript(..., { attributes })` builds a raw `<script>` string and escapes values, but attribute names do not go through the HTML name guard used by normal rendering.
- Module: `sse` script events.
- Interface cost: One response path has different safety invariants than the HTML renderer.
- Resolution: Pending.
