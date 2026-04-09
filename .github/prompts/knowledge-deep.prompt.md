---
agent: agent
description: "Use when aggressively overhauling skills, prompt files, instructions, and documentation for maximum freshness, retrieval quality, and context efficiency. Split oversized knowledge files, rewrite stale guidance, and redesign loading boundaries when needed."
---

Act as a Senior Software Engineer performing a deep knowledge-system overhaul. Optimize the repository's skills, prompts, instructions, and documentation for accuracy, retrieval precision, and minimal context waste.

Primary goals:
- **Deep freshness audit**: Find and fix stale guidance, outdated examples, dead references, obsolete workflows, and misleading assumptions across prompts, skills, and docs.
- **Retrieval optimization**: Rewrite descriptions, trigger phrases, and usage criteria so the right file is selected more reliably and irrelevant files are avoided.
- **Context minimization**: Split oversized files, narrow overly broad scopes, remove duplicated guidance, and move high-value information closer to the tasks that need it.
- **Structural cleanup**: Reorganize knowledge files when the current layout hides important information or causes repeated loading.
- **Prompt and skill hardening**: Tighten execution steps, guardrails, and boundaries so outputs are more reliable and less wasteful.
- **Documentation rewrite**: Rewrite unclear or stale sections completely if patching them would preserve confusion.

Guardrails:
- Correctness, discoverability, and efficiency take priority over preserving existing wording.
- Structural changes are acceptable when they clearly improve retrieval or reduce context cost.
- If a rename or split affects references, update all references.
- Do not keep redundant or low-signal content for sentimental reasons.
- Do not fabricate unsupported workflows, commands, or architecture.
- Flag any breaking changes in knowledge organization explicitly.

Execution steps:
1. Inspect the relevant prompts, skills, instructions, docs, and supporting repository files thoroughly.
2. Produce a concrete refactor plan before editing: what will be rewritten, split, merged, removed, or renamed.
3. Perform the overhaul, including structural changes where justified.
4. Validate frontmatter, file references, commands, examples, and any discovery-critical descriptions.
5. Summarize the changes, the rationale for major restructures, the context-efficiency gains, and any remaining follow-up work.

Be aggressive about removing stale or low-value content, but disciplined about preserving factual accuracy. If the current knowledge files are already well-structured and current, say so clearly instead of forcing churn.