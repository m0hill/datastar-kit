# T013 — Run the final surface audit and dead-code cleanup

## Status

`pending`

## Grill level

`2/5` — low-risk simplification after decisions are made.

## Why this task exists

After removing public APIs, the repo needs a final pass to ensure the cleanup actually reduced conceptual surface area rather than just moving complexity around.

## Recommended answer

Measure the final shape by local reasoning:

- Can a small app be understood from one example?
- Is there one blessed way to respond to Datastar actions?
- Is Effect used for real runtime value rather than ceremony?
- Are removed concepts absent from docs, tests, and exports?

## Implementation work

- Search for references to removed APIs.
- Delete dead tests that only protected accidental APIs.
- Add focused tests for the remaining blessed path.
- Run typecheck and tests.
- Count public exports before/after if helpful.
- Review `dist/` generation and package export behavior.
- Ensure no compatibility shims remain.

## Suggested checks

```sh
pnpm run typecheck
pnpm run test
pnpm run check:examples
rg "Runtime|Observability|Security|Validation|datastarHtmlPatchResponse|defineAction|defineQueryAction" src docs examples test README.md
```

Adjust the search list based on decisions from earlier tasks.

## Acceptance criteria

- Public API is intentionally small.
- No duplicate abstractions remain for the same concept.
- Docs/examples/tests agree on the same canonical model.
- Deleted modules do not linger in root exports or public docs.

## Anti-goals

- Do not add replacement abstractions during the cleanup pass.
- Do not keep dead files for possible future use.
- Do not optimize for backwards compatibility.
