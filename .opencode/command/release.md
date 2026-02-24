---
description: "Create a new semver release: bump version, lint, commit, tag, push and trigger CI/CD. Usage: /release [patch|minor|major]"
---

Create a new release for Momentum.

Argument: $ARGUMENTS (version bump type: patch, minor, or major — defaults to patch if omitted)

Steps:

1. Read the current version from the root `package.json`
2. Determine the bump type from $ARGUMENTS (default: patch). Calculate the new version following semver:
   - patch: 0.1.0 → 0.1.1
   - minor: 0.1.0 → 0.2.0
   - major: 0.1.0 → 1.0.0
3. Run `npm run lint` to ensure the codebase is clean. If lint fails, stop and report the errors.
4. Update the `version` field in the root `package.json` to the new version
5. Commit with message: `release: v{new_version}`
6. Create a git tag: `v{new_version}`
7. Push the commit and tag: `git push && git push origin v{new_version}`
8. Create a GitHub release on Nespouique/momentum for tag `v{new_version}` using curl with the `$GITHUB_TOKEN` environment variable (it is always available in the shell). Generate release notes from the commits since the previous tag. Example:
   ```bash
   curl -s -X POST \
     -H "Accept: application/vnd.github+json" \
     -H "Authorization: Bearer $GITHUB_TOKEN" \
     https://api.github.com/repos/Nespouique/momentum/releases \
     -d "{\"tag_name\":\"v{new_version}\",\"name\":\"v{new_version}\",\"body\":\"...\",\"draft\":false,\"prerelease\":false}"
   ```
9. Report the new version and confirm the CI/CD pipeline was triggered.
