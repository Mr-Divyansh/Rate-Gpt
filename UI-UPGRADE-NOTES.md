# Rate-GPT UI/UX upgrade — what changed

Copy these into your project (same paths), overwriting existing files:
  index.html, mandi-prices.html, about.html
  style/base.css (new), style/style.css, style/mandi-prices.css, style/about.css
  script/ (all files; i18n.js, icons.js, api.js, rate-ui.js are new)

Delete: style/global-nav.css (replaced by base.css). No changes to vite.config.ts, server or API.

Highlights
- Hindi / English toggle (remembers choice, auto-picks Hindi for Hindi browsers)
- Home: find-your-mandi form + "rate board" with min/max/modal range bars and trend line
- Prices: no popup; state > district > mandi chips; remembers last mandi; shareable URL
- Rows show range bar, modal price, change since last arrival (arrow + words)
- Skeleton loading, retry on errors, 48px touch targets, visible focus, reduced-motion
- Removed the unpkg lucide@latest dependency (inline SVG icons instead)
