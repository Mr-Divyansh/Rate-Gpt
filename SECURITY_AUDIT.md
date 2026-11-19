# Rate-GPT — Initial Security, Code, UX & Legal-Risk Audit

**Audit date:** 19 November 2026  
**Repository:** https://github.com/Mr-Divyansh/Rate-Gpt  
**Production target:** https://rate-gpt.vercel.app/  
**Method:** Read-only source review of the repository default branch, focused review of API middleware/routes, browser contact/weather code, deployment configuration and legal pages. No destructive testing, load testing, credential guessing, exploitation of third-party systems, or access to private user data was performed.

## Executive summary

The reviewed source has several good foundations: Zod validation for public API query parameters, bounded request bodies, Helmet security headers, a server-side government-data credential, short-lived edge caching, and honest documentation of upstream data limitations.

The highest-confidence issue found in this pass was a **privacy-policy accuracy defect**: the policy described contact messages and the Web3Forms credential as passing through the Rate-GPT server, while the contact implementation sends the form directly from the visitor's browser to Web3Forms. The English and Hindi policy text is corrected in this branch. The same branch removes the WeatherAPI source fallback and the unfinished homepage demo CTA.

This is an initial static audit, not a penetration-test certification. The production host could not be reached from the available network environment, so live response headers, deployed page behavior, and public endpoint behavior remain unverified in this pass.

## Findings

### F-01 — Privacy policy contradicted the actual contact data flow
- **Severity:** Medium — legal/compliance and user-transparency risk
- **Evidence:** `script/contact.js` posts a `FormData` payload directly to `https://api.web3forms.com/submit`. The policy previously said the form was sent to the Rate-GPT server and then to Web3Forms, and that the Web3Forms credential was transmitted server-side.
- **Impact:** Visitors could be given an inaccurate explanation of which systems receive their contact details and how the public form key is used.
- **Correction in this branch:** `privacy.html` now explains the browser-to-Web3Forms HTTPS flow in English and Hindi and clarifies that the public form access key is not a private account password.
- **Verification needed:** Review the wording against the actual Web3Forms account configuration and obtain qualified legal review before treating the policy as legally sufficient.

### F-02 — Rate limiting is per function instance, not a global quota
- **Severity:** Medium — resilience/abuse-resistance architecture risk
- **Evidence:** `server.ts` uses the default in-memory store from `express-rate-limit`. `docs/security.md` explicitly documents that quotas are process-local and not shared across Vercel instances.
- **Impact:** Requests distributed across serverless instances can exceed the nominal per-instance limit. Cold starts also reset in-memory counters.
- **Recommendation:** If abuse becomes material, use a supported shared rate-limit store or Vercel firewall/rate-limit controls. Keep limits endpoint-specific and monitor false positives. Do not claim a globally enforced quota while using process-local storage.
- **Status:** Partially remediated. A Vercel Firewall rule is now active for `/api/v1/`: fixed-window 100 requests per 300 seconds using IP + JA4 counting keys, with a 429 rate-limit response. Express instance-local limits remain as defense in depth. Vercel WAF counters are per region, so this is not one mathematically global counter; review traffic and adjust only with observed data.

### F-03 — Public contact form bypasses the application's contact limiter
- **Severity:** Medium — abuse-control gap
- **Evidence:** `server.ts` applies a five-attempt limiter to `/api/v1/contact`, but `script/contact.js` submits directly to Web3Forms. The public form therefore does not traverse the Express contact route or its limiter.
- **Impact:** The application-level five-attempt limit does not protect the actual public contact submission path. Protection depends on Web3Forms' own anti-spam, domain restrictions and account controls.
- **Recommendation:** Confirm provider-side domain restrictions, spam controls, notification controls and any available quotas. If a server-side proxy is desired, first verify the provider plan and server IP allowlisting; do not switch back to a server-side request that the provider rejects.
- **Status:** Partially mitigated. The form now submits directly to Web3Forms with a build-injected public key, explicit consent and a honeypot; native submission can work without JavaScript. The new Vercel `/api/v1/` WAF rule does not cover the direct provider request. Provider-side spam controls, allowed-domain restrictions and quotas remain unverified.

### F-04 — Weather API key is public and requires provider-side restrictions
- **Severity:** Low to Medium — third-party quota/abuse exposure
- **Evidence:** The original source contained a literal fallback. This branch removes it and reads only `VITE_WEATHERAPI_KEY`. The existing public key was moved into the Vercel Production environment configuration so the current production feature can continue working.
- **Impact:** The key can be copied and used outside the site, potentially consuming its quota. A hard-coded fallback also makes the active key difficult to rotate or disable through deployment configuration alone.
- **Recommendation:** Confirm the key is restricted through WeatherAPI's available controls and has suitable quotas. Vite-prefixed values remain public in the generated browser bundle; moving the value to deployment configuration improves rotation and source hygiene, not secrecy.
- **Status:** Source fix applied in this branch and a Production environment variable configured. Provider-side restrictions remain unverified and still require the WeatherAPI account owner.

### F-05 — CSP previously permitted inline style attributes
- **Severity:** Low — defense-in-depth opportunity
- **Evidence:** The original `vercel.json` and `server.ts` included `'unsafe-inline'` in `style-src`. This branch removes it and adds `style-src-attr 'none'` to both the static Vercel header and Express Helmet policy. A repository search found no static HTML style attributes; dynamic visualizations use CSSOM style properties.
- **Impact:** This weakens the policy's ability to constrain injected style markup. It is not, by itself, proof of an exploitable XSS vulnerability.
- **Recommendation:** Run the full browser regression suite and inspect browser CSP violation reports for every page, especially price bars and skeleton states.
- **Status:** Source hardening applied in this branch; browser regression verification is pending.

### F-06 — Homepage demo CTA opens a “coming soon” placeholder
- **Severity:** Low — product polish/trust
- **Evidence:** The previous homepage demo CTA opened a “Video coming soon” dialog. This branch removes the button, dialog and unused event handlers.
- **Impact:** A primary-looking action leads to an unfinished experience.
- **Recommendation:** Either add a real, accessible walkthrough or remove/rename the CTA until the demo is ready.
- **Status:** Fixed in this branch; homepage now keeps the primary price-discovery action without a nonfunctional demo control.

### F-07 — Production security posture could not be independently checked
- **Severity:** Verification gap, not a confirmed vulnerability
- **Evidence:** Requests to the production hostname from the available audit network failed at DNS resolution. No production response headers or live endpoint responses were obtained.
- **Impact:** Source configuration alone cannot prove the deployed edge configuration matches the repository.
- **Recommendation:** Re-run a small, authorized read-only production check from a network with access: homepage, contact page, weather page, health endpoint, CSP/HSTS/security headers, and expected 404/400 behavior. Avoid high-volume scanning.

## Positive controls observed

- Government OGD API credential is read from server-side `process.env.DATA_GOV_API_KEY` in the reviewed service, not intentionally exposed through Vite browser variables.
- Public API query parameters are bounded and validated with Zod schemas.
- JSON and URL-encoded request bodies are capped at 32 KB.
- Helmet config includes CSP, frame denial, HSTS and referrer policy.
- API responses default to `Cache-Control: no-store`; public read-only data routes opt into short edge TTLs.
- Error responses avoid returning stack traces and upstream response bodies.
- The code and docs explicitly state that AGMARKNET CAPTCHA-gated price-report endpoints are not bypassed and that unavailable price observations are not fabricated.
- The owner confirmed two Web3Forms test submissions appeared in the configured inbox; this is owner-observed confirmation, not independent inbox access by the auditor.

## Scope limitations

- No authenticated account, Vercel dashboard secret values, Web3Forms account settings, or private inbox contents were inspected.
- No credential stuffing, password guessing, destructive requests, load tests, denial-of-service tests, CAPTCHA bypass, data exfiltration, or third-party system testing was performed.
- No legal opinion is provided. Have an India-qualified lawyer review privacy, terms, operator identity/contact details, grievance handling, applicable data-protection obligations, third-party processor terms and any age-related requirements before making compliance claims.
- A “zero vulnerabilities” dependency audit and passing CI suite do not establish that an application is impossible to hack.

## Next verification priorities

1. Verify provider-side Web3Forms anti-spam, allowed-domain settings, quotas and retention.
2. Confirm WeatherAPI key restrictions and quotas with the provider.
3. Observe the active Vercel API rate-limit rule and tune it from real traffic; counters are regional.
4. Run browser regression tests against the tightened CSP, native contact form fallback and all dynamic price visualizations.
5. Run read-only production header and endpoint checks from a working network.
6. Obtain qualified legal review of the privacy and terms pages.
