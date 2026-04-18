# AI Skills Documentation

Focused skills files for AI assistants. Load only what's relevant to your current task.

## Prompt Files

Manual prompt files live in `.github/prompts/` and are grouped by intent.

| Prompt | Purpose | When to use |
|------|---------|--------------|
| **`refactor-simple`** | Conservative code cleanup | Safer default for naming, deduplication, dead code trimming, and maintainability work |
| **`refactor-deep`** | Aggressive code restructuring | Large refactors, API redesign, and breaking structural cleanup |
| **`optimize-simple`** | Conservative performance tuning | Improve runtime, memory use, rendering cost, or data-access efficiency without broad rewrites |
| **`optimize-deep`** | Aggressive performance optimization | Redesign hot paths, algorithms, and internal structure for major runtime or memory gains |
| **`knowledge-simple`** | Conservative docs/skills/prompt cleanup | Refresh stale references, tighten descriptions, and reduce context waste without broad rewrites |
| **`knowledge-deep`** | Aggressive knowledge-system overhaul | Split, merge, rename, or rewrite prompts, skills, instructions, and docs for better retrieval and efficiency |

## Naming Convention

- Use **`simple`** for safe, behavior-preserving, low-churn changes.
- Use **`deep`** for aggressive, restructuring-oriented passes.
- Use **`refactor`** for code quality and structure work.
- Use **`optimize`** for runtime, memory, rendering, query, and hot-path efficiency work.
- Use **`knowledge`** for prompts, skills, instructions, docs, and context-efficiency work.

## Skills Files

| File | Purpose | When to load |
|------|---------|--------------|
| **[skills-project.md](skills-project.md)** | Conventions, globals, file structure | Always for coding tasks |
| **[skills-architecture.md](skills-architecture.md)** | Module extraction, system design | Refactoring / new systems |
| **[skills-dnd5e.md](skills-dnd5e.md)** | Dice, combat, ability scores | Game mechanics work |
| **[skills-testing.md](skills-testing.md)** | Test patterns, mocks, debugging | Writing/fixing tests |
| **[skills-modding.md](skills-modding.md)** | YAML data, modding API | Data/modding work |
| **[skills-design.md](skills-design.md)** | Design doc map, decision recording | Planning features or systems |

## Usage Examples

### Coding tasks
- **Refactoring game.js** → `skills-project` + `skills-architecture`
- **Implementing combat damage** → `skills-project` + `skills-dnd5e`
- **Writing unit tests** → `skills-project` + `skills-testing`
- **Adding new weapon data** → `skills-project` + `skills-modding`

### Design tasks
- **Planning a new feature** → `skills-design` → load one relevant design doc
- **Reviewing tech approach** → `skills-design` → `docs/design/tech-stack.md`
- **Balancing combat** → `skills-design` + `skills-dnd5e`
- **Recording an architecture decision** → `skills-design` (see decision format)

### Refactor / optimize passes
- **Cleaning up code safely** → `refactor-simple`
- **Deep restructuring of a subsystem** → `refactor-deep`
- **Improving a hot path conservatively** → `optimize-simple`
- **Aggressively tuning a performance-critical system** → `optimize-deep`
- **Refreshing docs, prompts, or skills** → `knowledge-simple`
- **Overhauling docs and context structure** → `knowledge-deep`

## Slash Command

Type `/skills` in the chat to see this overview.
