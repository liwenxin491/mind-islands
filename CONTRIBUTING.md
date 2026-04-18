# Contributing to Mind Islands

This project is collaborative, but we want to keep `main` stable and easy to understand.

## Working Style

- `main` should stay deployable.
- Do not develop directly on `main` unless it is a tiny documentation-only fix.
- Prefer small, focused branches and pull requests.
- When in doubt, choose clarity over cleverness.

## Branch Naming

Use one of these prefixes:

- `feature/...` for new UI, flows, or features
- `fix/...` for bugs or regressions
- `refactor/...` for code cleanup without behavior change
- `docs/...` for documentation changes
- `chore/...` for maintenance tasks

Examples:

- `feature/home-memory-islands`
- `fix/quick-log-overlay-scroll`
- `docs/friend-onboarding`

## Basic Git Flow

1. Start from the latest `main`
2. Create a branch
3. Make a focused change
4. Run a local check
5. Commit with a clear message
6. Push your branch
7. Open a pull request into `main`

## Commands

Update local `main`:

```bash
git checkout main
git pull origin main
```

Create a branch:

```bash
git checkout -b feature/your-change-name
```

Push a branch the first time:

```bash
git push -u origin feature/your-change-name
```

## Commit Messages

Keep commit messages short and descriptive.

Good examples:

- `Refine mobile home layout`
- `Fix settings overlay sizing`
- `Add friend onboarding guide`

Try to avoid messages like:

- `update stuff`
- `changes`
- `fix bugs`

## Pull Request Expectations

A PR should usually:

- do one main thing
- explain what changed
- mention anything visually important
- mention any follow-up work or known limitations

A simple PR description template:

```md
## What changed
- ...
- ...

## How to test
- ...
- ...

## Notes
- ...
```

## Local Checks Before Pushing

At minimum, run:

```bash
npm run build
```

If you are working on UI:

- click through the changed screen(s)
- check mobile layout
- check desktop layout
- make sure overlays and navigation still work

## Environment Rules

- Never commit `.env.local`
- Never commit secret keys
- If you need production secrets, ask before using them
- For most UI work, `npm run dev:offline` is enough

## Deployment Rule

Only push to production from `main` after the change looks good locally.

## Design Notes

Current design direction:

- mobile-first
- sea-surface background
- centered sea otter avatar
- gentle blue / grey palette
- low-noise overlays
- soft, emotionally supportive tone

If you change this direction, call it out clearly in the PR.
