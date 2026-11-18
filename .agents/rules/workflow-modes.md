---
trigger: always_on
---

# Plan / Build Workflow

## Default mode is PLAN (read-only)
- Treat every conversation as discussion and planning until told otherwise.
- In plan mode, NEVER create, edit, rename or delete files, and NEVER run commands that change project state (installs, migrations, formatters, git operations that modify anything).
- Reading files, searching and read-only commands are allowed.

## Questions are not instructions
- "Check", "explain", "review", "how does X help" and "is this a good approach" mean: investigate and answer in chat only.
- If you find an improvement, describe it and wait. Do not apply it.

## Switching to BUILD mode
- Modify files only after an explicit "build", "implement" or "go ahead".
- Before building, summarize the agreed plan in a few bullets and wait for the user's OK. This is about editing files. Commit and push approvals are separate (`git-rules.md`).
- Implement only what was agreed. If something unplanned comes up, stop and ask.

## Returning to PLAN mode
- When a build task is finished, return to plan mode. Further changes need a new explicit "build".

## End of session
- When asked to wrap up, update `.agents/rules/current-status.md` (git-ignored): date, branch, what changed, what's next. This is the only edit allowed without a new "build".
