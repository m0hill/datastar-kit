# ts-star

`ts-star` is a Datastar helper package for server-driven TypeScript UI. The experimental direction treats it as an SDK that composes with fetch-compatible application frameworks rather than as an application framework itself.

## Language

**ts-star SDK**:
A small Datastar SDK for building server-driven UI with Web Standard request/response primitives.
_Avoid_: framework, runtime, app platform

**Application framework**:
The user-chosen HTTP/router framework that owns routing, middleware, deployment, auth, and app lifecycle.
_Avoid_: ts-star core

**Live query recipe**:
An app-owned SSE pattern that reloads current backend state after invalidation triggers.
_Avoid_: core runtime service, broker abstraction

**Datastar signal**:
A named browser-side value used as sparse request input or UI feedback state.
_Avoid_: schema contract, client store

**Datastar direct response**:
A Datastar protocol response that patches HTML, signals, or scripts through response body and headers without SSE framing.
_Avoid_: default response style

## Relationships

- The **ts-star SDK** is used inside **Application framework** handlers.
- The **Application framework** owns request dispatch and lifecycle; the **ts-star SDK** provides Datastar HTML, signal, SSE, and response helpers.
- The **ts-star SDK** uses explicit Web primitives at its boundary instead of an SDK-owned request context.
- Hono may be shown as an **Application framework** integration example, but it is not part of the **ts-star SDK** core.
- A **Live query recipe** may use the **ts-star SDK**, but it is not a core SDK abstraction.
- **Datastar signals** are authored directly with signal helpers; schema-derived contracts are not a core SDK abstraction.
- **Datastar signals** may be validated at the request boundary with Standard Schema; generic validation helpers are not part of the **ts-star SDK** core.
- **Datastar direct responses** are flat, explicit escape hatches; SSE patch helpers are the default documentation path.
- Datastar action response helpers own their protocol-required status codes; normal HTTP status semantics belong to plain `Response` objects or page responses.

## Example dialogue

> **Dev:** "Should `ts-star` define routes and middleware for a Hono app?"
> **Domain expert:** "No — Hono is the **Application framework**. The **ts-star SDK** should only help that handler read Datastar input and return Datastar-compatible responses."

## Flagged ambiguities

- "framework" was used to describe `ts-star`; resolved for the Web Standards experiment: call it the **ts-star SDK** unless explicitly discussing the existing Effect-native branch.
- Effect packages are intentionally absent from the Web Standards experiment; Effect can be brought by an application through Standard Schema compatibility, not by the **ts-star SDK** core.
- "contract" previously meant schema-derived signal helpers; resolved for the Web Standards experiment: core should use direct **Datastar signal** helpers instead.
