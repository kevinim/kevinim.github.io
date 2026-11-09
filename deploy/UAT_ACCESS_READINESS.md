# Family UAT — Zero Trust Access preflight (no deployment)

**Status: NOT PROVISIONED.** This implementation is a future verification harness. It has not created a private repository, Cloudflare project, Access application, login, family email allowlist, password, or DNS record. It does not change `https://kevinim.github.io/`.

## Why this is needed

Cloudflare Pages' official docs explain that preview Access policies do **not** automatically protect the main `<project>.pages.dev` hostname or attached custom domains. Branch aliases and immutable deployment URLs can also remain addressable after later publishes.

All of these must be protected and independently checked:

| Publicly addressable route | Planned protection |
| --- | --- |
| `https://<project>.pages.dev/` | Separate exact-host Access application, exact family email allowlist |
| `https://<branch>.<project>.pages.dev/` | Preview wildcard Access application |
| `https://<hash>.<project>.pages.dev/` | Preview wildcard Access application, including old immutable builds |
| Any UAT custom domain | Separate verified Access application/policy |
| Static app data: `/schools.json`, `/home-lookup-v2.js`, `/district-registry.js` | Same Access deny as `/index.html`; direct fetches must not bypass login |

The current `github.io` site remains a **public** page. Turning it into a family login *link* in a later, explicitly approved cutover does not authenticate it.

## What is already implemented now

- `deploy/uat-access-targets.example.json`: **unprovisioned template, null hostnames, zero family identifiers**. Do not put emails, tokens, cookies or provider keys into this public repository.
- `scripts/check-uat-anonymous-access.cjs --plan`: validates the template only, prints `NOT_PROVISIONED`, performs **zero network calls** and **never** claims Access is enabled.
- Pure offline unit tests: reject malformed or spoofed project hosts, other projects' preview aliases, missing branch/immutable URLs, duplicate domains, HTTP/port/authenticated URLs, unsafe redirects, anonymously accessible JSON/JS, and failures which could otherwise look like authorization.
- `.github/workflows/uat-access-preflight.yml`: read-only CI on relevant source changes. **No deploy or Cloudflare connection**.

## Later: owner-provisioned authenticated UAT

Only once the owner chooses to create an authenticated UAT:

1. Create a **new private** development GitHub repository. Import a curated source snapshot with a clean initial commit; do not assume public Git history is erased. Preserve the current working dashboard and original Pages deployment.
2. Create a Cloudflare Pages UAT project using a **blank holding page first**, so assets are not published while access policies are incomplete.
3. Set up Cloudflare Access for **both** primary project hostname and preview wildcards; attach separate Access policies for any custom domains. Explicitly allow **individual family email accounts**; no `Everyone`, `All valid emails` or bypass rule.
4. Determine the project's actual primary hostname, the actual Access team's login origin, one real branch alias and one real immutable hash deployment URL; list every custom domain. Use an **untracked, non-public** copy of `deploy/uat-access-targets.example.json` with `state: configured` and these validated values. Do not commit the configured copy to the public repo.
5. From a shell that has access to the untracked copy, run this **read-only** negative access check:

   ```bash
   UAT_ACCESS_READONLY_ACK=confirmed node scripts/check-uat-anonymous-access.cjs --live /private/path/uat-access-targets.json
   ```

   This performs unauthenticated GETs only, with cookies/credentials omitted and automatic redirects disabled. It checks `/`, `/index.html` and three representative static assets across primary, branch, immutable and declared custom origins. It accepts only redirects to the specified Cloudflare Access login origin or the application's own `/cdn-cgi/access/` route. A 200 response is **FAIL**; an unexplained 401/403 or network error is also **not proof of Access** and blocks signoff.
6. For each new branch deployment or custom alias, update the private target list and repeat. **A passing anonymous test is NOT sufficient for launch.** The owner must manually confirm the Cloudflare Access application rules, the exact approved family email allowlist, allowed login, disallowed email, sign-out/revocation, mobile login, preview URL inventory, all existing old aliases, and no cache bypass. Retain only a redacted approval report outside the public repository.
7. Only after real anonymous-denial + authorized/denied-user tests are complete should the full family dashboard be uploaded to UAT. The production public site and the current `github.io` gateway remain separate, and the owner must authorize any cutover.

## Important safety limits

- CI **does not** test a real Cloudflare tenant because none has been configured. Green CI means the *tool and placeholder* are valid, not that visitors are authenticated.
- A 302 redirect is an indication, not cryptographic proof of the Access policy owner. Re-check the exact policy in Cloudflare's administrative dashboard before approval.
- This test does not inspect Access policy email identities, bypassed service tokens, cached content, dynamic redirects, signed-in sessions or all potentially exposed static asset paths. Real UAT must undergo a fuller inventory and authenticated browser test.
- The live check must never be run against a random Internet hostname or the current `kevinim.github.io`. The validator confines it to an exact named Cloudflare Pages project and explicitly configured custom UAT origins.
- Do not hardcode `UAT_ACCESS_READONLY_ACK` in CI or add any Cloudflare token. The public repo's CI is intentionally **plan-only**.

Official documentation:
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/platform/known-issues/
- https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
