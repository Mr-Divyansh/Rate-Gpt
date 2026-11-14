# Security controls

- Government and Web3Forms credentials are read only from server-side environment variables.
- Zod caps and validates public filters and contact fields; JSON and URL-encoded bodies are limited to 32 KB.
- Helmet, compression, server-generated request IDs, and Express rate limits are enabled in `server.ts`.
- Live-data, metadata, and commodity routes have a stricter rate limit than general API routes; contact submissions have their own lower limit.
- API responses use `Cache-Control: no-store`; there is no stale price cache.
- The contact route requires explicit consent, has a honeypot, and sends requests to Web3Forms from the server rather than the browser.
- Production errors return safe error envelopes without credential values or stack traces.

The deployed static pages are served by Vercel, while `server.ts` protects the API function. A production response-header scan, Vercel environment review, and Web3Forms retention review require deployment/account access and are not inferred from source code.
