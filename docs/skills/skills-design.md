# Skills: Game Design

Game design documents and how to navigate them. Load when planning features, systems, or content — not needed for pure coding tasks.

## Obsidian Vaults

```
vault: myworld
path: /home/wonwong/git/wonwong/myworld
contents: game design docs (docs/design/), 5e reference (docs/ref/), code

vault: root
path: /home/wonwong/vault/root
contents: personal notes, daily todos, research
```

## Document Map

| Task | Load |
|---|---|
| Understanding the game overall | `docs/design/myworld.md` |
| Planning a combat feature | `docs/design/gameplay.md` |
| World or floor design | `docs/design/world-generation.md` |
| UI layout decisions | `docs/design/ui-design.md` |
| Choosing a tech approach | `docs/design/tech-stack.md` |
| Reviewing past decisions | `docs/design/decisions/decisions.md` |
| Phase planning / roadmap | `docs/design/roadmap.md` |
| 5e rules for a mechanic | `docs/ref/5e.md` → specific file |

## Design Document Structure

```
docs/design/
  myworld.md          ← start here — navigation index
  concept.md          ← elevator pitch, inspirations
  gameplay.md         ← core loop, combat, inventory, quests
  story-setting.md    ← world, tone, floor themes
  world-generation.md ← BSP, stage system, run state
  tech-stack.md       ← technology choices, file structure
  ui-design.md        ← panel layout, HUD, fog of war
  roadmap.md          ← phase 2–4 task lists
  modding.md          ← mod tiers
  decisions/
    decisions.md      ← index of all architecture decisions
    2026-04-16-*.md   ← individual decision records
```

## 5e Reference Structure

```
docs/ref/
  5e.md        ← index
  classes.md   weapons.md   armor.md
  races.md     statuses.md  spells.md
  monsters.md  feats.md     items.md
```

## Loading Strategy

- Load **one file at a time** — read `myworld.md` first, then follow links to the specific section needed
- Don't preload all design docs — they're only needed when the task touches design
- For a coding task with design context: load `skills-project.md` + the one relevant design doc

## When to Record a Decision

When the user makes a significant tech or design choice, offer to save it to `docs/design/decisions/` using the format:

```
docs/design/decisions/YYYY-MM-DD-short-name.md
```

Frontmatter: `tags`, `created`, `status: active`, `decider`.
Body: choice made, why, rejected alternatives, trade-offs.
Then update `docs/design/decisions/decisions.md` index table.
