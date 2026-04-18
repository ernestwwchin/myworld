# Copilot Prompts

Reusable prompt files for GitHub Copilot agent mode. Pick the variant matching the scope you want.

| Prompt | When to use |
|---|---|
| [knowledge-simple](knowledge-simple.prompt.md) | Conservative audit of skills/prompts/docs — refresh stale data, tighten context |
| [knowledge-deep](knowledge-deep.prompt.md) | Aggressive overhaul of the knowledge layer — splits, rewrites, retrieval redesign |
| [optimize-simple](optimize-simple.prompt.md) | Low-risk perf wins on hot paths without broad rewrites |
| [optimize-deep](optimize-deep.prompt.md) | Aggressive perf pass — algorithm/data-structure redesign for major gains |
| [refactor-simple](refactor-simple.prompt.md) | Clarity/dedup/modernization without behavior changes |
| [refactor-deep](refactor-deep.prompt.md) | Aggressive refactor — full rethink, breaking changes acceptable |
| [playwright-headed-test](playwright-headed-test.prompt.md) | Run a Playwright test headed with `slowMo` for manual observation |
| [suggest-todos](suggest-todos.prompt.md) | Extract 2–4 TODO candidates from current chat for GitHub issues |

## Related Copilot surfaces

- [`.github/instructions/`](../instructions/) — `applyTo`-scoped guidance auto-injected for matching files
- [`.github/skills/`](../skills/) — multi-file Copilot skills (e.g. `mod-feature-testing/`)
