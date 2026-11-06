# Vendored Datastar runtimes

Each `datastar-<version>.js` file is the unmodified Datastar bundle for that release (MIT licensed,
© Star Federation) from
`https://cdn.jsdelivr.net/gh/starfederation/datastar@v<version>/bundles/datastar.js`, with only the
trailing `sourceMappingURL` comment removed. The browser tests run once per bundle, offline, so
every supported Datastar release is checked.

There is one bundle for every supported release. To add a release, add its bundle here and its
version to `datastarVersions` in `vitest.config.ts`. Tests for features that only newer releases
have use `it.skipIf(!datastarAtLeast("<version>"))`.
