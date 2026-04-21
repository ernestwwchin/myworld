# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                         # dev server at http://localhost:3000 (Vite, HMR)
npm run build                     # production bundle → dist/
npm run typecheck                 # tsc --noEmit (0 errors on clean branch)
npm test                          # typecheck + contracts + unit (fast, no browser)
npm run test:contracts            # vitest run tests/contracts/run-contracts.test.js
npm run test:unit                 # vitest run
npm run test:e2e                  # build + Playwright against vite preview on port 3100
npm run test:e2e:headed           # headed + single worker (debugging)

# Run a single test
npx vitest run tests/unit/sandbox/modloader-auto-transition.test.js
npx playwright test tests/e2e/combat-attacks.spec.js --config tests/e2e/playwright.config.ts
```

If Playwright reports a missing browser, run `npx playwright install chromium`.

Source is TypeScript in `src/`; Vite bundles to `dist/`. Data files live under `public/data/` and are served at `/data/*` unchanged.

## Architecture

### Boot path
`index.html` has a single `<script type="module" src="/src/main.ts">`. `src/main.ts` imports `src/rng.ts` first (RNG init), then awaits `ModLoader.init()` to fetch YAML mod data (`MAP`, `ROWS`, `COLS`, `PLAYER_STATS`, `ENEMY_DEFS`, `ITEM_DEFS`, `TILE`, `MODE`, `COMBAT_RULES`, …), then constructs a `Phaser.Game` with `GameScene` (`src/game.ts`). All game state lives on that scene plus the module-level exports from `src/config.ts`.

### Mod system (data-driven core)
Mods are folders under `public/data/` with two-digit numeric prefixes that drive load order: `00_core` → `00_core_test` → `01_goblin_invasion` → … . Each mod's `meta.yaml` declares its `stages:` list and any `includes:` (creatures/weapons/classes/abilities/statuses/rules/sprites/loot-tables/items). Later mods win on conflicting ids. `00_core` is mandatory; content mods (e.g. `01_goblin_invasion`) declare a `startMap:` to set the opening stage.

Stage folder layout: `public/data/<mod>/stages/<stage_id>/{stage.yaml, events.yaml, dialogs.yaml}`. **`events.yaml` and `dialogs.yaml` are optional but every fetched path must exist** — when adding a new stage, create stub `events: []` and `dialogs: {}` files to avoid 404s in the network panel (the loader handles missing files gracefully but the noise is undesirable; this was BUG-6).

Design intent for any mod-facing change is in `.github/instructions/bg3-modding.instructions.md`: prefer YAML-driven mechanics, status-based rules over hardcoded special cases, and keep TS additions generic so multiple mods can reuse them. The full authoring reference is `docs/modding/README.md`.

### Stage progression and run state
`stage.yaml` declares `nextStage:` as either a literal stage id, `auto` (run planner picks based on `worlds.yaml` `depthBands`/`stageSequence`), `boss` (active world's `bossStage`), or `town` (configured hub). Resolution lives in `ModLoader.resolveNextStage()` and `_resolveStageDescriptor()` — depth-band entries can be strings or objects (`stageId`/`stage`/`id`/`targetStage`, `stageIndex`, `stageOffset`, `token`, optional `weight`).

Run state (`ModLoader._runState`) tracks `runId`, `seed`, `worldId`, `depth`, `acceptedQuests`, `carried`, `runGold`, `history`, `plannedStages`. Determinism for `nextStage:auto` keys off `(worldId, runId, seed, activeMap, nextDepth)`. Per-world `resolution.{extract,victory,death}` rules in `worlds.yaml` drive bank-to-stash, gold loss %, and full-heal on town return.

### Procedural maps
Stages with a `generator:` block (instead of `grid:`) run `src/mapgen.ts` — currently BSP and cellular automata. ModLoader persists the seed to `localStorage` so the same generated floor reappears across refreshes. **Generators must draw from `window.rng.map`, not `Math.random`** — a separate stream keeps map randomness from shifting dice/loot rolls.

For generated stages, `encounters:` use `count: N` (no x/y) and `applyCreatures` emits entries with `tx: -1, ty: -1`; `src/game.ts:_randomFloorTile()` resolves them into actual positions at scene start.

### Modes and turn flow
Two modes: `MODE.EXPLORE` and `MODE.COMBAT`. Combat entry uses BG3-style "engage → opener attack → on-hit start combat → roll initiative" flow (see `docs/play/combat.md` for canonical rules). Mode logic lives in `src/modes/`; combat AI in `src/modes/combat-ai.ts`.

### Inventory model
`PLAYER_STATS.inventory` is the **carried** run inventory. `PLAYER_STATS.stash` is **persistent town storage**. Extraction (per `resolution.extract.bankCarriedToStash`) moves carried → stash; death applies `goldLossPct` and `carriedItemLoss` per world config. Town interactables (`stash`/`stash_deposit_all`/`stash_withdraw_all`/`shop`/`quests`) are wired in `src/entities/interactable-entity.ts` — `shop` and `quests` are currently stubs returning "Coming soon".

### Test architecture
- **Contracts** (`tests/contracts/`) — schema/structural assertions run via vitest (`run-contracts.test.js`). Validates YAML shapes, mod metadata, registry resolution, and enforces absence of removed-feature TODOs.
- **Unit/pure** (`tests/unit/pure/`) — no game globals; pure helper logic. Run under vitest.
- **Unit/sandbox** (`tests/unit/sandbox/`) — imports directly from `src/` (same as unit/pure). Use this for tests that mutate singleton state (e.g. `ModLoader._modData`) and need explicit reset in `beforeEach`.
- **E2E** (`tests/e2e/`) — Playwright, runs against `vite preview` on port 3100. `helpers.js` provides shared boot/teardown.

### Globals to watch
After Phaser destroys a sprite, **null out the reference and guard subsequent access with `.active`** — this was the root cause of post-kill freeze bugs (see `docs/BUGS.md` archive). The same lesson applies to fog/sight overlays, which must be cleared on combat enter/exit.

## Conventions and gotchas

- **Stale docs:** `docs/ROADMAP.md` lags reality — many `[ ]` items are implemented (the map generator, World 1 scaffold, inventory split, extraction rules). Verify current state before treating roadmap checkboxes as truth.
- **No `--no-verify` on commits.** The pre-commit hook runs `gitleaks` for secret scanning; if it blocks, fix the underlying issue.
- **CI runs unit + contracts + e2e on every PR.** PR previews deploy to `myworld-pr-{N}.ernestwwchin.com`. Pushes to `main` deploy to nonprod; releases to prod (see README "CI/CD" section).
- **Stage references must resolve.** A contract test enforces that every `nextStage:` id (other than `auto`/`boss`/`town`/null) maps to a declared stage in some loaded mod.
- **ROWS/COLS are on `mapState`.** The mutable map dimensions live in `mapState` (exported from `src/config.ts`), not as module-level `let` bindings. `window.ROWS` / `window.COLS` shims are installed for any remaining read-sites.

## Where things live

Subsystem directories — the names are short; their responsibilities are not. Use this map before grepping.

- `src/modloader.ts` — single largest file; mod loading, stage registry, run state, descriptor resolution, save/restore. Most "global setup" questions land here.
- `src/game.ts` — `GameScene` (Phaser scene). Per-scene runtime: enemies, sprites, input wiring, mode transitions, random encounter placement.
- `src/main.ts` — boot sequence (rng → mods → Phaser).
- `src/config.ts` — global constants (`TILE`, `MODE`, `S` tile size, `COMBAT_RULES`, `mapState`). Also where to add new tile types.
- `src/mapgen.ts` — procedural generators (BSP + cellular automata).
- `src/modes/` — `mode-explore.ts`, `mode-combat.ts`, `combat-ai.ts`, `combat-ranges.ts`. Mode-specific behavior.
- `src/entities/` — `chest-entity.ts`, `door-entity.ts`, `floor-item-entity.ts`, `interactable-entity.ts`. Stage-placed objects with menus/actions.
- `src/systems/` — discrete subsystems each owning one concern: `fog-system`, `light-system`, `sight-system`, `movement-system`, `inventory-system`, `damage-system`, `leveling-system`, `status-effect-system`, `ability-system`, `camera-system`, `world-position-system`, `entity-system`, `event-runner`, `dialog-runner`, `chest-handler`, `door-handler`, `floor-item-handler`, `input-system`.
- `src/ui/` — DOM-side presentation (`hotbar.ts`, `side-panel.ts`, `combat-log.ts`, `action-buttons.ts`, `core-ui.ts`, `templates.ts`). Pure DOM, no Phaser.
- `src/autoplay.ts`, `src/demoplay.ts` — scripted test/demo drivers (data-driven via stage `events.yaml`).
- `src/flags.ts` (via `src/systems/flags.ts`) — global game-flag store (story flags, counters, etc.).
- `src/sprites.ts` — sprite atlas registration / texture loading.
- `src/helpers.ts`, `src/utils/common.ts` — small shared helpers; check `helpers.ts` first before adding a util.
- `public/data/00_core/` — base rules, creatures, weapons, classes, abilities, statuses, items, loot tables, sprites. Always loaded first.
- `public/data/00_core_test/` — disabled-by-default test mod with the `ts_*` stages used by `tests/e2e/` and contract tests.
- `public/data/01_goblin_invasion/` — first content mod (town hub + Goblin Warren run). Uses `worlds.yaml` for run progression and `creatures.yaml` for mod-specific enemies.
- `tests/contracts/helpers.js` — shared contract assertions; reuse before writing new ones.
- `tests/unit/_shared/io.js` — file-loading helper used by sandbox tests (`readText`, `loadYaml`).
- `tests/e2e/helpers.js` — Playwright boot/teardown helpers.

## Key documentation

- `docs/README.md` — top-level docs index, organized by audience (play/design/modding/ref/engineering/ideas)
- `docs/engineering/` — AI/dev reference (architecture, conventions, testing, subsystem refs)
- `docs/modding/README.md` — full mod authoring reference (tiers, hooks, schema)
- `docs/play/combat.md` — combat entry/turn/flee rules
- `docs/design/` — concept, gameplay, world-gen, story, decisions (ADRs)
- `docs/ref/5e/` — D&D 5e rules reference
- `docs/BUGS.md` — bug tracker (with archived fix notes worth scanning before re-investigating issues)
- `docs/ROADMAP.md` — feature plan (treat as direction, not state)
- `.github/instructions/bg3-modding.instructions.md` — design intent for mod-facing changes

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
