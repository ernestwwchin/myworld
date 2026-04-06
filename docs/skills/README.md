# AI Skills Documentation

Focused skills files for AI assistants. Load only what's relevant to your current task.

## Skills Files

| File | Purpose | When to load |
|------|---------|--------------|
| **[skills-project.md](skills-project.md)** | Conventions, globals, file structure | Always |
| **[skills-architecture.md](skills-architecture.md)** | Module extraction, system design | Refactoring / new systems |
| **[skills-dnd5e.md](skills-dnd5e.md)** | Dice, combat, ability scores | Game mechanics work |
| **[skills-testing.md](skills-testing.md)** | Test patterns, mocks, debugging | Writing/fixing tests |
| **[skills-modding.md](skills-modding.md)** | YAML data, modding API | Data/modding work |

## Usage Examples

- **Refactoring game.js** → `skills-project` + `skills-architecture`
- **Implementing combat damage** → `skills-project` + `skills-dnd5e`
- **Writing unit tests** → `skills-project` + `skills-testing`
- **Adding new weapon data** → `skills-project` + `skills-modding`

## Slash Command

Type `/skills` in the chat to see this overview.
