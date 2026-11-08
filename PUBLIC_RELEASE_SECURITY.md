# TX Dashboard — public release security review

Status: **AUDIT ONLY — no approval to market or publish a public-edition build.**

## Critical distinction

Sharing a website URL does not make repository source private. This project currently uses a publicly visible source repository. Even if the development repository later becomes private, browser-delivered HTML, JavaScript and static data remain readable by visitors.

## What this PR installs

- `scripts/public-release-gate.cjs audit`: reads tracked text and reports credential patterns, personalized commute indicators, external hostnames, and HTML sinks. Checks *new* sensitive indicators against the pull request base; existing personalized defaults are marked as launch blockers but do not interrupt ongoing feature development.
- `tests/public-release-gate.test.cjs`: automated checks for rules and redacted findings.
- `.github/workflows/public-release-security.yml`: CI for pull requests, weekly monitoring and manual review, including a full-history Gitleaks job. Read-only permissions. **No deploy job**.
- `node scripts/public-release-gate.cjs release <dist-dir>`: strict dry-run on a future, separately built distribution. Fails for credentials, personalized commute markers, development files, missing entry HTML or missing private-source separation confirmation. Does not deploy. The release pipeline may set `PUBLIC_SOURCE_SEPARATED=confirmed` only after verifying source separation and the final Pages settings.

## Required before external promotion

1. Inspect the CI report and any Gitleaks results. If a real secret appears, revoke or rotate it immediately and investigate historical exposure. Removing only the current text is insufficient.
2. Move full development history to private source (subject to plan/Pages behavior). Use a curated and independently verified distribution artifact for the public URL. Exclude development instructions, tests, source audits, backups and local configuration.
3. Remove customized default destinations and person-specific commute datasets from the public artifact while keeping user-entered search and generic demo choices.
4. Add clear address-search privacy disclosure. Address or coordinate inputs can reach external Esri, routing, map and other service providers; a static site cannot promise third-party logs are absent.
5. Review external terms, rate limits, attribution and caching for geocoding, routing, basemap tiles, institutional school datasets and third-party ratings.
6. Audit each untrusted data path reaching `innerHTML`, third-party links, and URL inputs; manually test mobile, school boundaries, map markers, address suggestions, and hazard layers.
7. Re-test the exact built distribution and run the strict release check. Establish branch protection and a deploy workflow with approvals. The owner then separately decides GO/NO-GO.

## Operational safeguards

- Do not merge unrelated work or force-push to `main` as part of security auditing.
- Do not switch Pages source or repository visibility in this stage.
- A green current-tree audit is not a full security certification. The current baseline personalization is explicitly NOT cleared for broad public promotion.
- Scanner reports do not print matched credential strings or entered addresses; findings are summarized by category and file.
- If CI shows a failure, review the category and fix the underlying issue. Do not add broad ignore rules or bypass a red security check merely to obtain a green build.

## GitHub administrative action required after CI is verified

The default branch had no protection rule at initial review. Add a ruleset for pull request reviews, security checks, and no force pushes; verify it applies under the account's plan. Because this change is made in repository Settings, it is outside this non-disruptive PR.
