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
