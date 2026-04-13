# MyWorld RPG

Browser-based tactical RPG prototype built with Phaser and served by Node + Express.

## Quick Start

1. Install dependencies:

```bash
npm install
```

1. Run the game:

```bash
npm start
```

1. Open:

- <http://localhost:3000>
- <http://localhost:3000/test>

## Project Structure

- [index.html](index.html): Main game page and UI shell.
- [test.html](test.html): Browser-based test runner page.
- [server.js](server.js): Express server entrypoint.
- [js](js): Runtime game logic (scene, UI, helpers, loader).
- [data](data): YAML-driven game content and rules.
- [data/stages](data/stages): Stage-folder content (BG3-style map/stage packaging).
- [tests](tests): Node-based automated validation scripts.

## Stage Folder Pattern

Preferred (BG3-like) stage definition location:

- [data/stages/b1f/stage.yaml](data/stages/b1f/stage.yaml)

Loader behavior:

- If a stage file under data/stages/map-id/stage.yaml exists, it is used.
- Otherwise loader falls back to [data/core/maps.yaml](data/core/maps.yaml).

## Documentation Index

- [Battle System Rules](BATTLE_SYSTEM.md): Combat entry, alert logic, actions, flee rules, and conditions.

## Combat Initiation Reminder

Current intended flow (BG3-style):

1. In explore mode, Engage first moves the player into melee range.
2. A single opener attack is resolved before combat mode begins.
3. If the opener misses, combat does not start.
4. If the opener lands, combat starts and initiative is rolled for everyone.
5. Initiative ordering uses roll plus Dexterity modifier (highest first).
6. Surprise is applied to unaware enemies and causes a first-turn skip; it does not change initiative score.

## Testing

Run automated tests:

```bash
npm test
```

E2E note:

- `@playwright/test` in `package.json` installs the Playwright library.
- Browser binaries are separate and may need a one-time install per environment (Windows, WSL, CI image).
- This repo currently runs `playwright install` via `postinstall` for convenience.
- Manual fallback: `npm run e2e:install:browsers`

## Backend Debug Tools

The server now includes opt-in debug helpers for local backend diagnostics.

Enable debug endpoints:

```bash
DEBUG_TOOLS=1 npm start
```

Enable request timing logs:

```bash
DEBUG_LOG_REQUESTS=1 npm start
```

Useful endpoints:

- <http://localhost:3000/health>
- <http://localhost:3000/_debug/health> (when `DEBUG_TOOLS=1`)
- <http://localhost:3000/_debug/config> (when `DEBUG_TOOLS=1`)
- <http://localhost:3000/_debug/routes> (when `DEBUG_TOOLS=1`)

Optional protection token for non-local access:

```bash
DEBUG_TOOLS=1 DEBUG_TOKEN=your-secret npm start
```

Then pass header `x-debug-token: your-secret` or query `?token=your-secret`.

## License

All rights reserved. This source code is provided for viewing purposes only. You may not use, copy, modify, or distribute any part of this project without explicit written permission from the author.

## Notes

Current server configuration in [server.js](server.js) serves [index.html](index.html) from the repository root at route `/`, so the current file placement is correct.
