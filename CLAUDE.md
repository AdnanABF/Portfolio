# Claude Code entry point

Project overview and commands:

@AGENTS.md

Shared rules (the source of truth):

@.agents/rules/current-status.md
@.agents/rules/workflow-modes.md
@.agents/rules/git-rules.md
@.agents/rules/project-safety.md
@.agents/rules/backend.md
@.agents/rules/frontend.md

## Claude-specific

- `.claude/settings.local.json` pre-approves `git commit` and `git push` on purpose, so an approval given in chat or in a plan (`git-rules.md`) is not followed by a second permission prompt for the same step.
- Next.js-specific guidance from `next dev` lives in `client/AGENTS.md`, which Claude Code does not load on its own. `frontend.md` says when to read it.
