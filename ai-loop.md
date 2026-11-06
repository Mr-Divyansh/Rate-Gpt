# Rate GPT — AI Collaboration Workflow

## Workflow
1. Read relevant project documentation.
2. Select one small task from `phases.md`.
3. Ask for a short plan before broad code changes.
4. Implement only the agreed scope.
5. Run relevant tests and inspect the diff.
6. Update docs when behavior or decisions change.
7. Record durable decisions in `memory.md`.
8. Commit with a clear message.

## Prompt template
```text
You are working on Rate GPT. Read the relevant project docs first.

Task: [one specific task]

Constraints:
- Follow rules.md.
- Follow the two-theme design in design.md.
- Never expose or hardcode secrets.
- Do not invent Government API fields or production prices.
- Keep changes limited to this task.

Before finishing:
- List files changed.
- Report tests actually run and their results.
- Mention assumptions and unresolved issues.
- Update relevant documentation.
```

## Safety checks
Never paste the real API key into AI prompts. Use placeholders. Review destructive database, file and deployment commands. Verify Government API behavior instead of assuming it.

## Definition of done
The task matches PRD and design, code is readable and typed, validation/error handling exists, tests are reported honestly, docs are updated and no secrets are committed.
