# Decisions

## D-001: Keep SDK fixes close to Datastar primitives

- Decision: Improve small Datastar-shaped authoring and response Modules instead of adding routing, validation, or app-state abstractions.
- Reasoning: The SDK is intentionally a narrow layer over Web Standards and Datastar.
- Rejected alternative: Add framework adapters or validation helpers. That would move app-owned policy into the SDK and reduce Locality for applications.

## D-002: Treat official examples as diagnostics, not the target

- Decision: Use examples to reveal Interface friction, then change SDK Modules first.
- Reasoning: The examples should become simpler because the SDK got deeper, not because example code was locally polished.
- Rejected alternative: Extract example-local helpers for repeated button, validation, or stream patterns. Those helpers would not improve SDK leverage.

## D-003: Avoid a broad expression DSL

- Decision: Add only small helpers for common Datastar expression shapes when examples show repeated caller formatting.
- Reasoning: Assignment, sequencing, and guarded execution are recurring JavaScript shapes. A full expression builder would reinvent Datastar.
- Rejected alternative: Build a typed JavaScript AST or reactive expression language. That would add an abstraction tower with poor Locality.

## D-004: Accept signal refs where signal names are already required

- Decision: Let `dataSignal` and `dataComputed` receive `Signal` refs as well as strings.
- Reasoning: A `Signal` ref already owns the signal path. Requiring `.name` leaks implementation detail without adding control.
- Rejected alternative: Add methods such as `signal.attrs(...)`. That would couple signal refs back to attribute rendering and create a larger Interface.

## D-005: Keep expression helpers JavaScript-shaped

- Decision: Add `set`, `sequence`, and `when` instead of higher-level UI verbs such as `closeModal`, `submitIfValid`, or `disableWhileFetching`.
- Reasoning: The repeated problem is JavaScript formatting around Datastar expressions, not domain behavior.
- Rejected alternative: Add one-off helpers for `disabled`, `confirm`, or modal actions. Those Modules would be shallow until more concrete variants justify them.

## D-006: Remove unused stream wrapper chunks

- Decision: Remove `SseChunk` instead of preserving it as a future extension point.
- Reasoning: No concrete caller needs a wrapper around a string. The existing string and byte chunk shapes cover current variants.
- Rejected alternative: Keep the wrapper for possible metadata. That would be a speculative Seam with no second variant.
