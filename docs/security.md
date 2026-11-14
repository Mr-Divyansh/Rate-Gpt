# Security controls

- Government and Web3Forms credentials are read only from server-side environment variables.
- Zod caps and validates public filters and contact fields; JSON and URL-encoded bodies are limited to 32 KB.
- Helmet, compression, server-generated request IDs, and Express rate limits are enabled in `server.ts`. The CSP permits same-origin scripts, required inline style attributes for dynamic price bars, and Google Fonts; it does not permit inline scripts or `unsafe-eval`.
- Vercel applies CSP, HSTS, frame protection, MIME sniffing protection, a strict referrer policy, and a restrictive Permissions-Policy to static responses through `vercel.json`.
- Live-data, metadata, and commodity routes have a stricter rate limit than general API routes; contact submissions have their own lower limit.
- Express rate limits use the process-local default store. They constrain each function instance but are not a globally shared quota across Vercel instances.
- API responses use `Cache-Control: no-store`; there is no stale price cache.
- The contact route requires explicit consent, has a honeypot, and sends requests to Web3Forms from the server rather than the browser.
- Production errors return safe error envelopes without credential values, upstream bodies, request payloads, or stack traces. Server logs use only bounded request identifiers and error names/codes.
- Contact submissions are forwarded to Web3Forms and are not written to a Rate-GPT database. The provider/account retention duration has not been verified and is not stated as a fixed period.

The deployed static pages are served by Vercel, while `server.ts` protects the API function. A production response-header scan, Vercel environment review, and Web3Forms retention review require deployment/account access and are not inferred from source code.
