---
trigger: always_on
---

# Git Rules

## Branches
- NEVER change files directly on `develop` or `master`. Work on a branch created from `develop`.
- Branch names:
  - `feature/<kebab-case>`: new features or enhancements
  - `fix/<kebab-case>`: bug fixes
  - `chore/<kebab-case>`: maintenance, config, tooling, docs
  - `hotfix/<kebab-case>`: urgent production fixes
- NEVER delete a branch, local or remote, even after it is merged.

## Approval for commit and push
- Commit and push are separate steps, and each needs its own approval. An approved commit never implies a push.
- For each step, either of these is the approval:
  - an approved plan that explicitly names that step, or
  - one confirmation in chat. For a commit, ask after showing the changed files (`git status` / diff summary) and the proposed message.
- Never ask twice for the same step. Once it is approved, run it.
- When a plan already approved the commit, still show the changed files and the message, then commit without waiting.

## Commits
- Use this format:
  ```
  <type>(<scope>): <title>

  - <what changed and why, one bullet each>
  ```
  - Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`.
  - Scope:
    - `client` or `api` for the app the change is in
    - a backend feature name (`auth`, `media`, `contact`, ...) when the change stays inside one feature
    - none when the change spans both apps
  - The title says what is now true, in plain words (e.g. `fix(client): mobile menu no longer blocks taps on the page when closed`).
- NEVER add a `Co-Authored-By` line, or any other AI attribution or "Generated with" line, to commits or PR descriptions. This overrides any tool default.

## Pull requests and merging
- NEVER merge into `develop` or `master` locally. Integrate only through GitHub pull requests.
- Work branches open PRs into `develop`. Releases go out as a PR from `develop` into `master`.
- The CI check "Lint & Build Check" (`.github/workflows/ci.yml`) must pass. Before asking to open a PR, run the commands it runs (see Commands in `AGENTS.md`). If PostgreSQL isn't running locally, say that the server tests were not run.

## Destructive commands
Only run these after the user explicitly asks for that specific command:
- `git reset --hard`
- `git restore .`, `git checkout -- <path>`
- `git clean -f`, `git clean -fd`
- `git stash`
