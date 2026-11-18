---
name: audit-fix-extensions
description: Run npm audit fix across all Firebase extensions, bump patch versions in extension.yaml, update CHANGELOGs, and open a consolidated PR. Use when the user asks to fix dependency vulnerabilities, run npm audit, consolidate dependabot PRs, or bump extension versions.
compatibility: Requires git, node, npm, jq, firebase CLI, and gh CLI
---

# Audit Fix Extensions

Consolidates dependency security fixes across all Firebase extensions into a single PR. Runs `npm audit fix` in each extension's `functions/` directory, bumps the patch version, and updates the CHANGELOG.

## Step-by-step

### 1. Check current vs published versions

Before bumping, understand which extensions are already ahead of the marketplace:

```bash
bash scripts/check-published-versions.sh '*'
```

This uses `firebase ext:dev:list googlecloud` to compare local `extension.yaml` versions against the marketplace. Note the output — it determines whether an extension is:
- **Matching**: local == published → new version = patch bump
- **Mismatched (local ahead)**: local > published → new version = another patch bump on local
- **Not published**: treat the same as matching for versioning purposes

### 2. Create a branch

```bash
git checkout -b chore/consolidate-dep-bumps
```

### 3. Run `npm audit fix` in each extension

Run in every extension's `functions/` directory **except `storage-reverse-image-search`**:

```bash
for ext in bigquery-firestore-export firestore-genai-chatbot firestore-incremental-capture \
  firestore-multimodal-genai firestore-palm-chatbot firestore-palm-gen-text \
  firestore-palm-summarize-text firestore-semantic-search firestore-vector-search \
  palm-secure-backend speech-to-text storage-extract-image-text storage-label-images \
  storage-label-videos storage-transcode-videos text-to-speech; do
  echo "=== $ext ===" && (cd "$ext/functions" && npm audit fix 2>&1 | tail -3)
done
```

Only `package-lock.json` files should change (not `package.json` unless a range changes). Verify with `git status`.

### 4. Determine new versions

For each extension, the new version is always a **patch bump** on the current local version:
- `0.1.9` → `0.1.10`
- `1.0.6` → `1.0.7`
- `0.0.19` → `0.0.20`

Run `scripts/check-published-versions.sh '*'` to get the full picture and record the mapping.

### 5. Bump `extension.yaml` versions

```bash
sed -i '' 's/^version:.*/version: <new-version>/' <extension>/extension.yaml
```

Repeat for each extension.

### 6. Update CHANGELOGs

Prepend a new section to each `CHANGELOG.md`:

```markdown
## Version <new-version>

- chore: run npm audit fix
```

**Critical — fold in unpublished intermediate versions**: If an extension's local version is already ahead of the marketplace (mismatched), there are unreleased entries sitting in the CHANGELOG between the published version and the new one. Merge all those intermediate entries into the single new version entry, then remove the intermediate `## Version X.Y.Z` headings. This keeps the number of pending publish operations to one per extension.

Example: if published is `1.0.5`, local is `1.0.6` (unreleased, adds Node.js 22), and we're bumping to `1.0.7` for audit fix:

```markdown
## Version 1.0.7

- chore: bump runtime to Node.js 22
- chore: run npm audit fix

## Version 1.0.5
...
```

### 7. Run formatting

```bash
npm run format
```

Ignore pre-existing lint rule warnings (`node/no-unpublished-import` etc.) — these are unrelated to the changes. Check `git diff --name-only` to see if any source files were touched by the formatter and include them in the commit.

### 8. Commit

Stage only the files we changed (do not stage `.firebaserc` or `firebase.json`):

```bash
git add \
  <ext>/CHANGELOG.md <ext>/extension.yaml <ext>/functions/package-lock.json \
  ...
git commit -m "chore: run npm audit fix across all extensions and bump versions"
```

### 9. Verify

```bash
# Confirm all package versions were actually bumped
node scripts/check-extension-version-main.js '*'
```

(All will show as mismatched — expected, since the branch is ahead of main.)

Optionally spot-check a specific dep was fixed:
```bash
git diff HEAD~1 -- <ext>/functions/package-lock.json | grep -A2 '"<package-name>"'
```

### 10. Push and open PR

```bash
git push -u origin chore/consolidate-dep-bumps
gh pr create --title "chore: run npm audit fix across all extensions and bump versions" \
  --body "..."
```

Include in the PR body:
- A version bump table (old → new for each extension)
- A "Supersedes: #NNN #NNN ..." list of all dependabot PRs being closed

### 11. Close superseded dependabot PRs

Only close PRs for extensions we actually ran `npm audit fix` in. Do **not** close root-level or `_emulator/functions` dependabot PRs — those are not covered by this workflow.

```bash
for pr in <pr-numbers>; do
  gh pr close $pr --comment "Superseded by #<consolidated-pr>."
done
```

## What to skip

- **`storage-reverse-image-search`**: excluded from this workflow
- **Root-level dependabot PRs** (lerna, minimatch, etc.): handle separately
- **`_emulator/functions` PRs**: handle separately
- **`npm audit fix --force`**: only fixes things that require breaking changes — do not use unless explicitly asked
