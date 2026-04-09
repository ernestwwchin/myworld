---
agent: agent
description: "Use when running Playwright tests with a visible browser window (headed mode) for manual observation and debugging."
---

Run a Playwright test in headed mode so the browser is visible.

Requirements:
- Launch browser with `headless: false`.
- Use `slowMo` (100-250ms) so actions are easy to observe.
- Keep to one browser instance unless I explicitly request multiple.
- Prefer deterministic maps and stable test steps.

Default test map strategy:
- Use `?map=ts_floor_transition_a` for floor transition checks.
- Verify transition to `ts_floor_transition_b` after stepping on stairs.

Execution steps:
1. Confirm local server is running at `http://localhost:3000`.
2. Open one headed Playwright browser page.
3. Navigate to the requested map URL.
4. Execute only the requested scenario (for example, movement to stairs, one combat turn, or floor transition).
5. Report concise before/after state (floor, mode, player tile, target reached).
6. Close the browser unless I ask to keep it open.

Guardrails:
- Do not modify game source code unless I explicitly ask.
- If a run fails, report exact error and retry once with minimal adjustments.
- Avoid broad exploratory scripts when a focused one-shot script can validate the scenario.

Output format:
- `Scenario:`
- `Map:`
- `Headed:` yes/no
- `Result:` pass/fail
- `Details:` key state changes and any errors
