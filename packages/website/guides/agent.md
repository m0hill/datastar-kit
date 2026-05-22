# Coding Agents

Coding agents write better Datastar Kit code when they can inspect real source, tests, and examples instead of guessing from package types or short documentation snippets.

The best setup is to vendor the Datastar Kit repository into your application as read-only reference material, then tell your agent when to inspect it.

## Vendor the source

Add the repository under a dedicated `repos/` directory:

```sh
git subtree add \
  --prefix=repos/datastar-kit \
  https://github.com/m0hill/datastar-kit.git \
  main \
  --squash
```

Update it when you want the agent to see newer patterns:

```sh
git subtree pull \
  --prefix=repos/datastar-kit \
  https://github.com/m0hill/datastar-kit.git \
  main \
  --squash
```

The `--squash` flag keeps the vendored repository from importing its full commit history into your project.

## Configure the agent

Add a short note to `AGENTS.md`, `CLAUDE.md`, or the instruction file your agent reads:

```md
## Vendored Repositories

This project vendors external repositories under @repos/.

- Use @repos/datastar-kit as read-only reference material when writing Datastar Kit code.
- Inspect its source, tests, examples, and docs for idiomatic `ds`, `read`, `reply`, JSX, signals, patches, streams, and Request/Response patterns.
- Prefer patterns from the vendored source over generated guesses or web search.
- Do not edit files under @repos/ unless explicitly asked.
- Do not import from @repos/; application code should import from normal package dependencies.
```

For a focused task, ask the agent to read the relevant area first:

```md
Before changing this Datastar Kit flow, inspect @repos/datastar-kit/packages/datastar-kit/test and @repos/datastar-kit/examples for matching patterns. Use the vendored repository as reference only.
```

## Keep editor noise down

If your editor starts suggesting imports from `repos/`, exclude that directory from search, file watching, and auto-imports. In VS Code:

```json
{
  "typescript.preferences.autoImportFileExcludePatterns": ["repos/**"],
  "javascript.preferences.autoImportFileExcludePatterns": ["repos/**"],
  "files.exclude": {
    "repos/**": true
  },
  "files.watcherExclude": {
    "repos/**": true
  },
  "search.exclude": {
    "repos/**": true
  }
}
```

Next: [Examples](examples.md). Related: [Testing](testing.md), [Architecture](../reference/architecture.md).
