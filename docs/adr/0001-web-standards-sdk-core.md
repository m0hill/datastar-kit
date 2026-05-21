# Web Standards SDK core for the experiment

Status: accepted for `experiment/web-standards-core`

The Web Standards experiment treats Datastar Kit as a Datastar SDK that composes inside fetch-compatible application frameworks, not as an application framework or runtime. Core helpers use explicit `Request`/`Response`/`Headers`/`URL`/`ReadableStream` primitives, keep Hono and other frameworks as examples only, remove the previous required runtime dependency entirely, and avoid SDK-owned routing, context, live-query, or schema-contract abstractions so the comparison tests a genuinely small Web Standards core.
