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
8. Create a GitHub release using `gh release create v{new_version} --generate-notes` if gh CLI is available, otherwise instruct the user to create the release manually on GitHub.
9. Report the new version and confirm the CI/CD pipeline was triggered.
