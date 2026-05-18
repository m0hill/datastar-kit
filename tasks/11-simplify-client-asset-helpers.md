# T011 — Delete client asset helpers and make Datastar runtime inclusion explicit

## Status

`pending`

## Grill level

`3/5` — design cleanup with settled decisions.

## Why this task exists

Earlier versions of `ts-star` treated Datastar client/runtime serving as a framework helper concern:

- `Client` namespace;
- `datastarScript()`;
- `datastarDocument()`;
- `datastarPageResponse()`;
- `datastarClientResponse()`;
- `datastarClientRoute()` / file-route helpers;
- build-time copying of `vendor/datastar.js`;
- dev-server `/datastar.js` serving.

After the cleanup of responses, runtime, HTML, and platform APIs, this is too much. The framework should not own a static asset pipeline or silently inject a browser runtime. Applications should compose the script tag explicitly in the HTML they render.

## Settled direction

Do **not** expose public client helpers.

Do **not** inject Datastar's script from `reply.page`.

Do **not** provide a default CDN URL.

Do **not** serve `/datastar.js` from framework helpers or dev tooling.

Use explicit HTML instead:

```ts
const datastarCdn = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

reply.page({
  head: h("script", { type: "module", src: datastarCdn }),
  body: appNode
})
```

For non-response document rendering, use the same plain HTML boundary:

```ts
page({
  head: h("script", { type: "module", src: datastarCdn }),
  body: appNode
})
```

## Decisions reached

- Delete the public `Client` namespace entirely.
- Delete `src/client.ts` unless a tiny internal helper remains temporarily during refactor.
- Delete `datastarScript`; users write the normal `h("script", ...)` tag.
- Delete `datastarDocument`; use `page({ head, body, lang })` directly.
- Delete `datastarPageResponse`; use `reply.page({ head, body, lang }, responseOptions?)`.
- Change `reply.page` to mirror the HTML `page({ head, body, lang })` object shape.
- Delete `scriptSrc` from reply/page option types.
- Remove Datastar asset route helpers completely.
- Remove vendored Datastar runtime from `ts-star` and use a pinned CDN in examples/tests.
- Remove build-time vendor copying and dev-server `/datastar.js` serving.

## Implementation work

- Remove `Client` from `src/index.ts`.
- Remove root exports from `src/client.ts`.
- Delete `src/client.ts` if no internals need it.
- Update `src/reply.ts` so `reply.page` imports `page` from `html.ts`, not `datastarDocument` from `client.ts`.
- Change `reply.page` signature to `reply.page(options, responseOptions?)`, mirroring `page(options)`.
- Remove `scriptSrc` from reply/page option types.
- Remove `vendor/datastar.js` and `dist/vendor/datastar.js` from the package workflow.
- Remove `cp vendor/datastar.js dist/vendor/datastar.js` from `package.json` build script.
- Remove dev-server `/datastar.js` route and any runtime file reads.
- Update examples to include an explicit pinned CDN script tag in the page head.
- Update browser integration tests to use the same pinned CDN approach.
- Delete or rewrite `test/client.test.ts` and export tests that assert client helpers.
- Update docs mentioning `Client.*`, vendored assets, or local `/datastar.js` serving.

## Acceptance criteria

- There is no public `Client` namespace.
- There are no public Datastar client asset helpers.
- `reply.page` does not inject scripts and has no `scriptSrc` option.
- Pages that need Datastar include a script tag explicitly with `h("script", ...)`.
- Examples/tests use a pinned CDN URL explicitly.
- Build/dev scripts do not copy or serve a local Datastar runtime.

## Anti-goals

- Do not add CDN constants to core.
- Do not add static asset serving helpers.
- Do not keep compatibility aliases for `datastarDocument` or `datastarPageResponse`.
- Do not keep a near-empty `Client` namespace for possible future use.
- Do not make `reply.page` magical again by injecting client runtime assets.
