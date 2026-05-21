# Datastar Kit

Datastar Kit is a Datastar helper package for server-driven TypeScript UI. The experimental direction treats it as an SDK that composes with fetch-compatible application frameworks rather than as an application framework itself.

## Language

**Datastar Kit SDK**:
A small companion SDK for building Datastar server-driven UI with Web Standard request/response primitives.
_Avoid_: ts-star, official Datastar SDK, framework, runtime, app platform

**Application framework**:
The user-chosen HTTP/router framework that owns routing, middleware, deployment, auth, and app lifecycle.
_Avoid_: Datastar Kit core

**Live query recipe**:
An app-owned SSE pattern that reloads current backend state after invalidation triggers.
_Avoid_: core runtime service, broker abstraction

**Datastar signal**:
A named browser-side value used as sparse request input or UI feedback state.
_Avoid_: schema contract, client store

**Signal State**:
A strict runtime object tree of Datastar signal values that can safely cross the Datastar protocol boundary.
_Avoid_: generic JSON object, expression object

**Signal State Input**:
An SDK authoring object that can contain literal signal values or Datastar expressions before being rendered into client-side Datastar code.
_Avoid_: Signal State, JSON payload

**Datastar direct response**:
A Datastar protocol response that patches HTML, signals, or scripts through response body and headers without SSE framing.
_Avoid_: default response style

## Relationships

- The **Datastar Kit SDK** is an independent companion to Datastar, not the official Datastar runtime package.
- The **Datastar Kit SDK** is used inside **Application framework** handlers.
- The **Application framework** owns request dispatch and lifecycle; the **Datastar Kit SDK** provides Datastar HTML, signal, SSE, and response helpers.
- The **Datastar Kit SDK** uses explicit Web primitives at its boundary instead of an SDK-owned request context.
- Hono may be shown as an **Application framework** integration example, but it is not part of the **Datastar Kit SDK** core.
- A **Live query recipe** may use the **Datastar Kit SDK**, but it is not a core SDK abstraction.
- **Datastar signals** are authored directly with signal helpers; schema-derived contracts are not a core SDK abstraction.
- **Signal State** contains the runtime values used by **Datastar signals** and is distinct from arbitrary app JSON.
- **Signal State Input** may render into **Signal State**, but can contain SDK expression helpers that are not runtime data.
- **Datastar signals** can be decoded with only a JSON object shape check or decoded and validated at the request boundary with Standard Schema; schema validation is an opt-in safety layer, not a required SDK gate.
- Generic validation helpers are not part of the **Datastar Kit SDK** core.
- **Datastar direct responses** are flat, explicit escape hatches; SSE patch helpers are the default documentation path.
- Datastar action response helpers own their protocol-required status codes; normal HTTP status semantics belong to plain `Response` objects or page responses.

## Example dialogue

> **Dev:** "Should Datastar Kit define routes and middleware for a Hono app?"
> **Domain expert:** "No — Hono is the **Application framework**. The **Datastar Kit SDK** should only help that handler read Datastar input and return Datastar-compatible responses."

## Flagged ambiguities

- "framework" was used to describe the package; resolved for the Web Standards experiment: call it the **Datastar Kit SDK**.
- `ts-star` was the working package name; resolved: public package/product name is **Datastar Kit** / `datastar-kit`.
- Datastar-branded naming could imply official project ownership; resolved: describe **Datastar Kit** as an independent companion SDK.
- Effect packages are intentionally absent from the Web Standards experiment; Effect can be brought by an application through Standard Schema compatibility, not by the **Datastar Kit SDK** core.
- "contract" previously meant schema-derived signal helpers; resolved for the Web Standards experiment: core should use direct **Datastar signal** helpers instead.
- Signal reading was briefly framed as requiring validation; resolved: schema validation is optional, and schema-free reads should still return parsed **Signal State** rather than raw transport strings.
