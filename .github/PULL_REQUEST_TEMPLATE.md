## What changed
<!-- Scope, affected features, and source data/provenance if relevant. -->

## Verification and release risk
- [ ] Relevant CI checks inspected (including `verify`; **all** relevant failures addressed)
- [ ] Desktop and mobile paths checked; dark-mode contrast reviewed if UI changed
- [ ] School/map guardrails checked if affected: Allen markers nonzero, selected-area zoom, school boundaries/markers independent, current official Finder provenance
- [ ] Privacy/security audit reviewed where appropriate; no secrets, sensitive defaults or unsupported risk/expense estimates included
- [ ] Rollback/revert path documented

**Test evidence:** <!-- Link to runs, screenshots, exact tests, or explain N/A -->
**Known limitations / open blockers:** <!-- No blockers? Say none and why. -->
**Rollback target / method:** <!-- Commit SHA or tested rollback steps -->

## Owner's live-site release decision
- [ ] **NO-GO / Keep Draft** — work or tests remain incomplete
- [ ] **GO / Ready for manual owner merge** — checks, screenshots and risks reviewed

**Caution:** Only the owner's manual **Merge pull request** represents sign-off to update the **current** public GitHub Pages site. Self-approval via PR Review is not supported. Do not auto-merge, treat green CI as automatic permission to ship, or interpret this merge as a launch approval for future family UAT/separate Public Production.

Process: [Free release-signoff runbook](https://github.com/kevinim/kevinim.github.io/blob/main/docs/FREE_RELEASE_SIGNOFF_RUNBOOK.md)
