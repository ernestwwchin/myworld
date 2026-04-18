# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                         # serve game at http://localhost:3000 (Express, no build step)
npm test                          # contracts + unit (fast, no browser)
npm run test:contracts            # node tests/contracts/run-contracts.js
npm run test:unit                 # node --test tests/unit/{pure,sandbox}/**/*.test.js
npm run test:e2e                  # Playwright; spins up the server on port 3100
npm run test:e2e:headed           # headed + single worker (debugging)

# Run a single test
node --test tests/unit/sandbox/modloader-auto-transition.test.js
npx playwright test tests/e2e/combat-attacks.spec.js --config tests/e2e/playwright.config.js
```

If Playwright reports a missing browser, run `npx playwright install chromium`. The local CLI binary at `node_modules/.bin/playwright` has gone 0-byte before — restore with `ln -s ../playwright/cli.js node_modules/.bin/playwright`.

There is no lint/build step. Files in `js/` are served verbatim; everything is global (no module system).

## Architecture

### Boot path
`index.html` loads every JS file as a `<script>` tag (no bundler). `js/main.js` awaits `ModLoader.init()` to pull YAML mod data into globals (`MAP`, `ROWS`, `COLS`, `PLAYER_STATS`, `ENEMY_DEFS`, `ITEM_DEFS`, `TILE`, `MODE`, `COMBAT_RULES`, …), then constructs a single `Phaser.Game` with `GameScene` (`js/game.js`). All game state lives on that scene plus the globals above.

### Mod system (data-driven core)
Mods are folders under `data/` with two-digit numeric prefixes that drive load order: `00_core` → `00_core_test` → `01_goblin_invasion` → … . Each mod's `meta.yaml` declares its `stages:` list and any `includes:` (creatures/weapons/classes/abilities/statuses/rules/sprites/loot-tables/items). Later mods win on conflicting ids. `00_core` is mandatory; content mods (e.g. `01_goblin_invasion`) declare a `startMap:` to set the opening stage.

Stage folder layout: `data/<mod>/stages/<stage_id>/{stage.yaml, events.yaml, dialogs.yaml}`. **`events.yaml` and `dialogs.yaml` are optional but every fetched path must exist** — when adding a new stage, create stub `events: []` and `dialogs: {}` files to avoid 404s in the network panel (the loader handles missing files gracefully but the noise is undesirable; this was BUG-6).

Design intent for any mod-facing change is in `.github/instructions/bg3-modding.instructions.md`: prefer YAML-driven mechanics, status-based rules over hardcoded special cases, and keep JS additions generic so multiple mods can reuse them. The full authoring reference is `docs/modding_guide.md`.

### Stage progression and run state
`stage.yaml` declares `nextStage:` as either a literal stage id, `auto` (run planner picks based on `worlds.yaml` `depthBands`/`stageSequence`), `boss` (active world's `bossStage`), or `town` (configured hub). Resolution lives in `ModLoader.resolveNextStage()` and `_resolveStageDescriptor()` — depth-band entries can be strings or objects (`stageId`/`stage`/`id`/`targetStage`, `stageIndex`, `stageOffset`, `token`, optional `weight`).

Run state (`ModLoader._runState`) tracks `runId`, `seed`, `worldId`, `depth`, `acceptedQuests`, `carried`, `runGold`, `history`, `plannedStages`. Determinism for `nextStage:auto` keys off `(worldId, runId, seed, activeMap, nextDepth)`. Per-world `resolution.{extract,victory,death}` rules in `worlds.yaml` drive bank-to-stash, gold loss %, and full-heal on town return.

### Procedural maps
Stages with a `generator:` block (instead of `grid:`) run `js/mapgen.js` — currently cellular automata only. ModLoader persists the seed to `localStorage` so the same generated floor reappears across refreshes. **Generators must draw from `window.rng.map`, not `Math.random`** — a separate stream keeps map randomness from shifting dice/loot rolls.

For generated stages, `encounters:` use `count: N` (no x/y) and `applyCreatures` emits entries with `tx: -1, ty: -1`; `js/game.js:_randomFloorTile()` resolves them into actual positions at scene start.

### Modes and turn flow
Two modes: `MODE.EXPLORE` and `MODE.COMBAT`. Combat entry uses BG3-style "engage → opener attack → on-hit start combat → roll initiative" flow (see `BATTLE_SYSTEM.md` and the README "Combat Initiation Reminder" for canonical rules). Mode logic lives in `js/modes/`; combat AI in `js/modes/combat-ai.js`.

### Inventory model
`PLAYER_STATS.inventory` is the **carried** run inventory. `PLAYER_STATS.stash` is **persistent town storage**. Extraction (per `resolution.extract.bankCarriedToStash`) moves carried → stash; death applies `goldLossPct` and `carriedItemLoss` per world config. Town interactables (`stash`/`stash_deposit_all`/`stash_withdraw_all`/`shop`/`quests`) are wired in `js/entities/interactable-entity.js` — `shop` and `quests` are currently stubs returning "Coming soon".

### Test architecture
- **Contracts** (`tests/contracts/`) — schema/structural assertions run by a custom runner (`run-contracts.js`). Validates YAML shapes, mod metadata, registry resolution, and enforces absence of removed-feature TODOs.
- **Unit/pure** (`tests/unit/pure/`) — no game globals; pure helper logic.
- **Unit/sandbox** (`tests/unit/sandbox/`) — loads `js/modloader.js` (and similar files) into a `vm.createContext` sandbox to test methods without a browser. Use this pattern when adding tests for any browser-only file.
- **E2E** (`tests/e2e/`) — Playwright, runs against a live server on port 3100. `helpers.js` provides shared boot/teardown.

### Globals to watch
After Phaser destroys a sprite, **null out the reference and guard subsequent access with `.active`** — this was the root cause of post-kill freeze bugs (see `docs/BUGS.md` archive). The same lesson applies to fog/sight overlays, which must be cleared on combat enter/exit.

### Server
`server.js` is a 17-line static Express server. Port via `PORT` env var (defaults 3000; e2e uses 3100). The README mentions `DEBUG_TOOLS=1` debug endpoints — they're not actually present in the current `server.js`; treat that section of the README as aspirational/stale.

## Conventions and gotchas

- **Stale docs:** `docs/ROADMAP.md` lags reality — many `[ ]` items are implemented (the map generator, World 1 scaffold, inventory split, extraction rules). Verify current state before treating roadmap checkboxes as truth.
- **No `--no-verify` on commits.** The pre-commit hook runs `gitleaks` for secret scanning; if it blocks, fix the underlying issue.
- **CI runs unit + contracts + e2e on every PR.** PR previews deploy to `myworld-pr-{N}.ernestwwchin.com`. Pushes to `main` deploy to nonprod; releases to prod (see README "CI/CD" section).
- **Stage references must resolve.** A contract test enforces that every `nextStage:` id (other than `auto`/`boss`/`town`/null) maps to a declared stage in some loaded mod.

## Where things live

Subsystem directories — the names are short; their responsibilities are not. Use this map before grepping.

- `js/modloader.js` — single largest file; mod loading, stage registry, run state, descriptor resolution, save/restore. Most "global setup" questions land here.
- `js/game.js` — `GameScene` (Phaser scene). Per-scene runtime: enemies, sprites, input wiring, mode transitions, random encounter placement.
- `js/main.js` — boot sequence (mods → Phaser).
- `js/config.js` — global constants (`TILE`, `MODE`, `S` tile size, `COMBAT_RULES`). Also where to add new tile types.
- `js/mapgen.js` — procedural generators (currently CA only).
- `js/modes/` — `mode-explore.js`, `mode-combat.js`, `combat-ai.js`, `combat-ranges.js`. Mode-specific behavior.
- `js/entities/` — `chest-entity.js`, `door-entity.js`, `floor-item-entity.js`, `interactable-entity.js`. Stage-placed objects with menus/actions.
- `js/systems/` — discrete subsystems each owning one concern: `fog-system`, `light-system`, `sight-system`, `movement-system`, `inventory-system`, `damage-system`, `leveling-system`, `status-effect-system`, `ability-system`, `camera-system`, `world-position-system`, `entity-system`, `event-runner`, `dialog-runner`, `chest-handler`, `door-handler`, `floor-item-handler`, `input-system`.
- `js/ui/` — DOM-side presentation (`hotbar.js`, `side-panel.js`, `combat-log.js`, `action-buttons.js`, `core-ui.js`, `templates.js`). Pure DOM, no Phaser.
- `js/autoplay.js`, `js/demoplay.js` — scripted test/demo drivers (data-driven via stage `events.yaml`).
- `js/flags.js` — global game-flag store (story flags, counters, etc.).
- `js/sprites.js` — sprite atlas registration / texture loading.
- `js/helpers.js`, `js/utils/common.js` — small shared helpers; check `helpers.js` first before adding a util.
- `data/00_core/` — base rules, creatures, weapons, classes, abilities, statuses, items, loot tables, sprites. Always loaded first.
- `data/00_core_test/` — disabled-by-default test mod with the `ts_*` stages used by `tests/e2e/` and contract tests.
- `data/01_goblin_invasion/` — first content mod (town hub + Goblin Warren run). Uses `worlds.yaml` for run progression and `creatures.yaml` for mod-specific enemies.
- `tests/contracts/helpers.js` — shared contract assertions; reuse before writing new ones.
- `tests/unit/_shared/io.js` — file-loading helper used by sandbox tests (`readText`).
- `tests/e2e/helpers.js` — Playwright boot/teardown helpers.

## Key documentation

- `docs/modding_guide.md` — full mod authoring reference (tiers, hooks, schema)
- `docs/BUGS.md` — bug tracker (with archived fix notes worth scanning before re-investigating issues)
- `docs/ROADMAP.md` — feature plan (treat as direction, not state)
- `BATTLE_SYSTEM.md` — combat entry/turn/flee rules
- `docs/ai_behavior.md`, `docs/fog-of-war.md`, `docs/depth-layers.md`, `docs/debug-bridge.md` — focused subsystem references
- `.github/instructions/bg3-modding.instructions.md` — design intent for mod-facing changes
