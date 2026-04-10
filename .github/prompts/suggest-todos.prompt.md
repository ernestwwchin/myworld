---
name: suggest-todos
description: "Use to analyze current chat context and suggest TODO items to capture as GitHub issues. Extracts bugs, features, technical debt, and other work items found during development."
---

# Suggest TODOs from Chat

Analyze the current chat and suggest 2-4 concrete TODO items that are worth tracking.

Use this process:
1. Extract likely work items from the current chat: bugs, features, refactors, docs, performance, research, testing, design, blocked tasks.
2. Present 2-4 suggestions as concise titles with a type.
3. Ask me to choose one suggestion or provide a custom one.
4. Ask for optional context (files, line numbers, notes).
5. Show a short summary and ask for explicit confirmation before creating an issue.
6. If confirmed, create the issue with gh CLI and report the created issue number/link.

## Suggested TODOs from Current Work

Provide 2-4 suggestions based on this chat in this format:
- [Type] Title
- [Type] Title
- [Type] Title

---

## TODO Types Reference

| Type | Icon | Description |
|------|------|-------------|
| **Bug Fix** | 🐛 | Something broken that needs fixing |
| **Feature** | ✨ | New capability or enhancement |
| **Refactor** | 🔧 | Code cleanup, technical debt |
| **Documentation** | 📚 | Missing or unclear docs |
| **Performance** | ⚡ | Speed/optimization work |
| **Research** | 🔍 | Investigation or spike needed |
| **Testing** | ✅ | Test coverage gaps |
| **Design** | 🎨 | UI/UX improvements |
| **Blocked** | 🚫 | Work paused waiting for something |

---

## Create GitHub Issue

After I confirm, create the issue using gh CLI.

```bash
gh issue create \
  --title "<type>: <title>" \
  --body "<context from chat and additional notes>" \
  --label "<type-label>"
```

If the label does not exist, retry without --label (or use todo if available) so creation does not fail.

## Label Mapping

- Bug Fix -> bug
- Feature -> enhancement
- Refactor -> technical-debt
- Documentation -> documentation
- Performance -> performance
- Research -> research
- Testing -> testing
- Design -> design
- Blocked -> blocked
