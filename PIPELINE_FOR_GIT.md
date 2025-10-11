A practical, no-nonsense guide for keeping an ongoing `mod` branch for your Rotki modifications.

This file contains:

- Exact commands you can copy-paste.
- Short technical explanations (what the command does).
- Functional explanations (why this fits your workflow).
- PlantUML diagrams showing the branches and rebase flow.

---

## Overview & goals

**Goal:** have one canonical long-lived branch (`mod`) that represents the *actual* Rotki build you run and maintain, while keeping `develop` pristine as a mirror of `upstream/develop`. Use short-lived `feat/*` branches for individual changes and merge them into `mod` once tested.

**Why this works for you:**

- `develop` is your easy reset point to match upstream (low friction to sync).
- `mod` is your running product: everything you locally run and test comes from this branch.
- `feat/*` branches are tiny and disposable: rebase/merge them frequently to reduce conflicts.

This pattern balances **ease of syncing with upstream** and **ability to run a stable custom build** locally.

---

## Branch roles (short)

- `upstream/develop`  -  the official Rotki repository's develop branch (remote: `upstream`).
- `origin/develop`  -  your fork's develop (remote: `origin`).
- `develop` (local)  -  keep this an exact mirror of `upstream/develop`.
- `mod`  -  long-lived branch that contains your running/custom changes.
- `feat/*`  -  short-lived branches created from `mod` for discrete work.

---

## Sending changes upstream

1. Sync your clean base:
   ```bash
   git fetch upstream
   git checkout develop
   git reset --hard upstream/develop
   ```
2. Branch from that mirror (cherry-pick from `mod` if needed):
   ```bash
   git checkout -b feat/my-fix
   ```
3. Implement and test locally, then push the feature branch to your fork:
   ```bash
   git push -u origin feat/my-fix
   ```
4. Open a PR from `origin/feat/my-fix` → `upstream/develop`.
5. After merge, rebase `mod` onto the updated `upstream/develop` so your custom build picks up the upstream change.

---

## Keeping `mod` in sync with upstream safely

### Update `develop` to upstream

```bash
# fetch the latest branches and commits from the upstream remote (official Rotki repo)
git fetch upstream

# switch to your local develop branch (the one that mirrors upstream/develop)
git checkout develop

# force your local develop to exactly match upstream/develop - discards any local commits on develop
git reset --hard upstream/develop
```

### Rebase `mod` on `upstream/develop` - safe staging strategy

```bash
# step 1: make sure you are on your mod branch
git checkout mod  # switch to mod so we base from current running build

# step 2: create a safety snapshot before rebasing (easy rollback)
git branch backup/mod-before-rebase-$(date +%Y%m%d%H%M)

# step 3: create or reuse a staging branch dedicated to rebase work
git checkout -B mod-rebase-staging  # -B recreates or resets the branch to HEAD

# step 4: fetch latest upstream refs (updates upstream/develop pointer)
git fetch upstream

# step 5: rebase your work on top of upstream/develop
git rebase upstream/develop

# during conflicts, fix files then stage and continue
# repeat these two until rebase completes:
#   git add <file>
#   git rebase --continue

# tip: to skip a problematic commit during rebase, you can use:
#   git rebase --skip
# to abandon the rebase entirely and return to pre-rebase state:
#   git rebase --abort
```

### Conflict resolution during rebase - practical steps

Use these while the rebase is paused due to conflicts. Each command is commented.

```bash
# see high level state - what commit, which files are conflicted
git status  # shows 'both modified' files, rebase state, next action

# list only the conflicted paths (handy for copy-paste)
git diff --name-only --diff-filter=U

# open a specific conflicted file to inspect conflict markers <<<<<<<, =======, >>>>>>>
# (use your editor - example below uses VS Code)
code <path/to/file>

# choose one side wholesale for a file (useful for generated files)
# keep upstream version for the file
git checkout --theirs <path/to/file>
# or keep your version for the file
git checkout --ours <path/to/file>

# after editing or choosing a side, stage the file to mark it resolved
git add <path/to/file>

# if you staged the wrong thing, unstage without discarding worktree changes
git restore --staged <path/to/file>

# if you want to discard local file changes and start over from pre-rebase state
# - this resets both the index and worktree copy of the file
git restore --source=HEAD --staged --worktree <path/to/file>

# check status again to verify all conflicts for the current commit are resolved
git status

# continue the rebase once the index is clean (no conflicts)
git rebase --continue

# if a single commit is too messy, skip it (rare - only when you are sure it is safe)
git rebase --skip

# if things went sideways, abort the rebase and return to the state before it began
git rebase --abort
```

**Generated files rule of thumb:** If a file is generated and should come from source-of-truth elsewhere (for example `frontend/app/typed-router.d.ts`), do not hand-edit it. Prefer one side with `--theirs` or `--ours`, regenerate, then `git add` and continue.

### Promote rebase result to main mod branch

```bash
# ensure you are on mod before moving the pointer
git checkout mod

# take a second safety snapshot just before promotion
git branch backup/mod-before-promote-$(date +%Y%m%d%H%M)
```

**1) Try this first: prefer clean fast forward if possible**

```bash
# move mod forward to the tested staging tip without creating a merge commit
git merge --ff-only mod-rebase-staging
```

If the previous command fails with something like:

```
fatal: Not possible to fast-forward, aborting.
```

use the hard reset approach.

**2) If fast forward fails try this: hard reset mod to the tested staging tip**

```bash
# point mod exactly at mod-rebase-staging - use when fast forward is not possible
git reset --hard mod-rebase-staging
```

```bash
# update your fork's remote mod branch - protected by --force-with-lease
git push origin mod --force-with-lease

# optional cleanup - keep the staging branch if you want to reuse it next time
# git branch -d mod-rebase-staging
```

### Reusing your staging branch for future syncs

If you plan to keep `mod-rebase-staging` for repeated rebases:

```bash
# move the staging branch to the latest promoted mod tip so it starts clean next time
git checkout mod-rebase-staging

# ensure staging branch is exactly at mod
git reset --hard mod

# pull in newest upstream refs
git fetch upstream

# perform a new rebase cycle
git rebase upstream/develop
```

This way you don’t need to recreate the staging branch each time. Just rebase again, test, and promote.

---

### Safety nets

```bash
# always create a quick backup branch before history updates
git branch backup/mod-before-rebase-$(date +%Y%m%d%H%M)

# enable Git's rerere to auto remember conflict resolutions across rebases/merges
git config --global rerere.enabled true

# when you must rewrite the remote mod pointer, use lease to avoid clobbering others
git push origin mod --force-with-lease
```

---

## One-page workflow recap

1. `git fetch upstream && git checkout develop && git reset --hard upstream/develop`
2. `git checkout mod && git rebase upstream/develop`
3. For each feature: `git checkout -b feat/... mod` → develop → merge into `mod`
4. `git push origin mod`
5. (Optional) Repeat rebase flow using persistent `mod-rebase-staging`

---

## FAQs

**Why rebase instead of merging?** Rebasing keeps a clean, linear history and makes future syncing easier.

**What if **``** diverges too much?** Split large changes into smaller `feat/*` branches and rebase incrementally.

**Can I submit patches upstream from **``**?**\*\* Yes  -  prefer PRs from `feat/*` branches for clarity.

---

*End of file.*
