# Datastar SDK conformance goldens

`get/` and `post/` are copied unmodified from
[`sdk/tests/golden`](https://github.com/starfederation/datastar/tree/v1.0.4/sdk/tests/golden) in
`starfederation/datastar` at `v1.0.4` (MIT licensed, © Star Federation). The files are identical
in every release from `v1.0.0` to `v1.0.4`.

Each case has an `input.json`, which Datastar's test runner sends as the signals of a GET (in the
`datastar` query parameter) or POST (as the JSON body), and an `output.txt` with the SSE response
an SDK must produce for it. `test/sse-sdk-fixtures.test.ts` replays every case through
`read.signals` and `reply.stream`.

To update, copy the directory again from the newest Datastar release.
