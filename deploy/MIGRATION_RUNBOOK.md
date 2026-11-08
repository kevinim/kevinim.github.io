# TX DFW Dashboard — Family UAT / Public Production migration

> **Status: PREPARATION ONLY — NO DEPLOYMENT.** The current live `https://kevinim.github.io/` is unchanged. These files are written on a feature branch, not on `main`.

## Approved target architecture (2026-11-08)

```text
                       PRIVATE development repository (new; not created yet)
                       |  review / unit tests / browser QA
                       +--------------------+----------------------
                       |                                           |
        Family UAT Cloudflare Pages                   Public Production Cloudflare Pages
        access-controlled by email                    SEPARATE project and hostname
        `https://<uat>.pages.dev/`                      `https://<prod>.pages.dev/`
        allow exact family emails                     sanitized build; public data only
        lock primary AND preview aliases              deploy only on release approval
                       ^
                       | link (never dashboard assets)
                       |
                `https://kevinim.github.io/`
                PUBLIC two-file family login gateway
                (public URL remains public, not authenticated)
```

The exact UAT/Production hostnames are placeholders, NOT provisioned URLs. Do not publish those names as working links until projects are created and verified.

### Source of truth

- Once migrated, Claude/Codex change only the **private development repository**. No writes to the existing `kevinim.github.io/main` during ordinary feature development.
- UAT continuously receives approved development commits; all deployed UAT content MUST be behind Cloudflare Access BEFORE uploading the family site. If Pages auto-deploys before Access is configured, publish only a harmless empty placeholder first.
- Production receives a **sanitized, explicitly approved build** from the private source, not raw repository files. Use an independent Cloudflare Pages project hostname to avoid browser same-origin sharing with `kevinim.github.io`.
- The GitHub Pages user URL is a separate public *entrance*. After cutover it must serve only the minimal `index.html` and `robots.txt` from a dedicated Pages artifact, **not the current source root**.
- Public GitHub repository history will remain discoverable until source history is separately handled. This design does not erase material already public. Make an archival plan and rotate any confirmed leaked secrets.

## Prepared implementation

| Component | Role |
| --- | --- |
| `scripts/build-family-entry.cjs preview` | Build two-file **holding page**, no live UAT URL and no dashboard assets |
| `scripts/build-family-entry.cjs cutover` | Build family login link only after explicit `FAMILY_UAT_URL` and all required Access/owner attestations; **never deploy** |
| `deploy/environment-plan.json` | Machine-checked three-environment definition, hosts unassigned, deployment disabled |
| `scripts/validate-environment-plan.cjs ... planning` | Assert no shared origin, correct provider role and no enabled deployment |
| `tests/family-entry.test.cjs` and `tests/environment-plan.test.cjs` | Negative tests for fake Access, mixed UAT/Prod hosts, unsafe URLs and deletion outside `dist/` |
| PR #72 `scripts/build-public-preview.cjs` | Read-only sanitized production *candidate*, blocked from live release |

## Exact cutover gates — all MUST pass

### A — Private source migration (not yet authorized/applied)

1. Create a **new private** GitHub repository for development. Do not change the visibility of `kevinim.github.io` yet.
2. Import the current verified working code as a **new clean first commit** (no need to copy exposed historical Git objects). Keep a separately secured local archival copy if needed.
3. Move feature development, school-data and CI jobs to that repository. Update Claude/Codex remotes only after verifying all existing QA checks.
4. Prevent automatic deployment to either public site while the private repo migration is under test.

### B — Cloudflare Family UAT

1. In Cloudflare Pages create an UAT project connected to the private repository, **initially deploy a harmless holding page**, not the current family dashboard.
2. Enable Cloudflare Zero Trust Access for the primary `<uat>.pages.dev` hostname AND wildcard preview/branch deployment URLs (`*.<uat>.pages.dev`). Cloudflare docs caution that protecting just previews does not protect the primary host.
3. Allow only **individual family email addresses** through Access; use one-time PIN or an approved identity provider. Never select `Everyone` or `All valid emails`.
4. For a logged-out/incognito browser confirm the index page AND static files like `/schools.json`, `/index.html`, and `/home-lookup-v2.js` are denied or redirected to Access login. Verify all preview and custom-domain aliases too.
5. Verify approved user sign-in (returns dashboard after OTP), blocked email denial, sign-out/revocation and mobile login.
6. After anonymous denial succeeds, deploy the complete UAT dashboard. Re-test Allen/CFB/LISD school markers, boundaries, lookups, hazard layers, address suggestions and mobile UI.

### C — Independent Public Production

1. Create a **separate Cloudflare Pages project** and choose a new public hostname (or custom domain). Do not place Production under a path of `kevinim.github.io`: this is the SAME browser origin.
2. Deploy only the approved sanitized `dist/public-preview` build after revisiting the vendor ToS and dataset licensing. Public production must not contain family commute presets or the UAT source/history.
3. Check external service quotas, no client-side API secrets, CSP, accessibility and all high-risk browser functionality. Confirm unauthenticated Production is intentionally reachable.
4. Keep Production deployment blocked behind a GitHub Environment approval and full CI, separate from UAT auto-updates.

### D — Switch `kevinim.github.io` to family entrance ONLY

1. **First** confirm UAT can be used by family and all anonymous UAT access paths are blocked. Confirm Production works separately.
2. Record `main` commit SHA, existing Pages source mode, Pages URL, and secure rollback copy in a location **not public**.
3. Generate the `cutover` landing build only after the exact four `confirmed` attestations and validated UAT HTTPS host. The builder never deploys on its own.
4. Use a dedicated, approved Pages Actions artifact containing ONLY `index.html` and `robots.txt`, with manual approval. Do not publish the previous site source tree.
5. Check `kevinim.github.io/` displays only the family login link and old web assets return 404 (the public GitHub repository history remains a separate exposure).
6. If login fails, roll back to a neutral holding page rather than the previously public family dashboard. Never restore exposed family assets merely to achieve uptime.

## Checks currently NOT completed

- New private GitHub repository creation/migration and Cloudflare account/Access policy setup.
- Real allowed/blocked email tests, primary/preview host denial, and browser tests across those live hosts.
- Third-party provider rate/redistribution approvals.
- New Production hostname provisioning, separate deploy credentials, Environment approvals, rollback rehearsal.
- Switching or deploying the existing GitHub Pages user site.

## User-visible URL implications

- The root URL cannot itself be hidden behind Cloudflare Access because `github.io` DNS is not user-owned. It can only show an unauthenticated login link (like this implementation).
- A malicious visitor may view or link-share the gateway; authentication is enforced **at the target UAT host**, not via HTML password, JavaScript logic, robots exclusion, or an obscure URL.
- UAT source repo privacy is separate from site privacy. Both private GitHub source AND Cloudflare Access on ALL deployed UAT hostnames are required.

## Operational rollback and no-conflict policy

- Work is isolated on `infra/family-uat-prod-separation-20261108`, stacked on security PR #72. School QA PR #73 and external-data audit PR #76 are independent.
- DO NOT merge this PR, create Pages deployments, change repository visibility, set external API keys, or alter DNS during preparation.
- Before a later go-live, compare the live main SHA with recorded baseline; if it moved, re-run full QA and revisit all target paths. Never force-push.

Official docs: https://developers.cloudflare.com/pages/platform/known-issues/ , https://developers.cloudflare.com/pages/configuration/preview-deployments/ , https://developers.cloudflare.com/cloudflare-one/access-controls/policies/ , https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages .
