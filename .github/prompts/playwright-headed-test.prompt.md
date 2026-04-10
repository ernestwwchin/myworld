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
- If the user does not specify a scenario/test, run the full e2e suite in headed mode.

Default test map strategy:
- Use `?map=ts_floor_transition_a` for floor transition checks.
- Verify transition to `ts_floor_transition_b` after stepping on stairs.

Default test selection behavior:
- If the user specifies a scenario, run only that scenario.
- If the user specifies a test file or test name, run only that target.
- If the user does not specify anything, run all e2e tests (headed, slowMo, single worker).

Execution steps:
1. Confirm local server is running at `http://localhost:3000`.
2. If no specific scenario is requested, run the full e2e suite with headed mode (`--headed`) and one worker (`--workers=1`).
3. If a specific scenario is requested, open one headed Playwright browser page.
4. Navigate to the requested map URL.
5. Execute only the requested scenario (for example, movement to stairs, one combat turn, or floor transition).
6. Report concise before/after state (floor, mode, player tile, target reached), or a concise full-suite pass/fail summary.
7. Close the browser unless I ask to keep it open.

Guardrails:
- Do not modify game source code unless I explicitly ask.
- If a run fails, report exact error and retry once with minimal adjustments.
- Avoid broad exploratory scripts when a focused one-shot script can validate the scenario.
- For default full-suite runs, prefer Playwright CLI with headed mode instead of custom scripts.

Output format:
- `Scenario:`
- `Map:`
- `Headed:` yes/no
- `Result:` pass/fail
- `Details:` key state changes and any errors
