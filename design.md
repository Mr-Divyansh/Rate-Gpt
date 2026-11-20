# Rate GPT — Design Specification

> Note: this file previously described an early black/white minimal concept that was
> never shipped. It has been rewritten to document the actual design system in
> `style/base.css` and the page-level stylesheets, so a reader (human or agent) doesn't
> get a false picture of the live site.

## 1. Direction
Warm, trustworthy and grounded in agriculture — not generic SaaS. Mandi prices are the
main focus; every page should read as "government data, made easy to search," not as a
marketing product.

## 2. Approved brand palette (Forest Green / Warm Ivory / Harvest Gold)

| Token | Value | Use |
|---|---|---|
| `--forest` | `#174d38` | Headings, primary ink on light surfaces |
| `--green` | `#287a52` | Links, secondary accents, eyebrow labels |
| `--ivory` | `#f7f7f0` | Page background |
| `--surface` | `#ffffff` | Cards, inputs |
| `--gold` | `#e9a23b` | Sparing use — highlights, the "harvest" accent |
| `--ink` | `#202b25` | Body text |
| `--muted` | `#66736b` | Secondary text |
| `--line` | `#e5e9e2` | Borders |
| `--soft` | `#eaf2ec` | Subtle fills |
| `--on-forest` | `#f3f6ee` | Text/icons on dark-green surfaces (e.g. the home rate board) |

Gradients, soft shadows and rounded corners are used deliberately (the home hero, the
live rate board, dialogs) — this is a conscious departure from the old "no gradients /
no decorative elements" rule, kept consistent site-wide.

## 3. Typography
`Anek Latin` + `Anek Devanagari` (a single variable-font family spanning both scripts),
falling back to Inter / system-ui / Noto Sans Devanagari. This was chosen specifically
because the site is bilingual (English/Hindi) and needed one typeface that renders both
scripts at a matching weight and rhythm. Body text is 1.0625rem / line-height 1.6. Price
values use `font-variant-numeric: tabular-nums` so columns of numbers line up.

## 4. Layout
Mobile-first, centered content (`--wrap: 1180px`), a persistent header/nav and footer
from `global-nav.js`, generous gutters (`--gutter`). Avoid crowded screens; the mandi
price finder is an inline, no-dialog flow (state → district → mandi).

## 5. Screens
### Home
- Full-screen hero: kicker, headline, lede, primary CTA ("See prices"), secondary
  "Watch demo" CTA that opens an in-page video dialog, trust line.
- A live "rate board" card (on-forest background) showing the latest records for a
  default/nearby market, with a sparkline trend and a link into the full price page.

### Mandi prices (the core product page)
- Intro banner, inline location finder (state/district/mandi chips, recent markets),
  crop search with Ctrl+K shortcut, sort/date filters, a desktop table + mobile card
  list, CSV export, pagination, and explicit sync/freshness status.
- No historical price charts — Rate-GPT does not store price observations, so the UI
  explains on-demand fetch context instead of pretending there's history.

### About / Weather / Contact / Terms / Privacy
Same header/footer chrome and token set; About uses a numbered step list only where the
content is a genuine sequence (how-it-works steps, the project's journey) — generic
section numbering was removed from section headings that aren't actually sequential.

## 6. Components
Header/nav (`global-nav.js`), footer, LocationFinder (inline), CommoditySearch,
PriceTable, PriceCard (mobile), PriceSummary/RateBoard, Sparkline, Pagination,
LoadingState (skeletons), EmptyState, ErrorState, DataFreshness chip, Demo dialog.

## 7. Interaction
Language toggle (EN/HI) persists via `i18n.js` and updates all `data-i18n` /
`data-i18n-attr` text live. Clear filters resets filters and pagination. Loading states
use skeletons, not spinners, where a shape is known in advance. Errors are shown, never
hidden. Motion is kept to one deliberate moment per surface and respects
`prefers-reduced-motion` globally.

## 8. Accessibility and responsive behaviour
Semantic headings, skip link, visible focus rings, labelled inputs, `aria-live` regions
for async updates, sufficient contrast on both light and on-forest surfaces. Desktop
uses a table; mobile uses stacked cards. All images carry real or empty (`alt=""`)
alt text as appropriate; none are missing it.

## 9. Data & security notes relevant to design
- `priceStorage: disabled` — prices are always fetched on demand, never cached/served
  stale, by product decision (not just an implementation detail).
- The WeatherAPI key is intentionally used client-side (the CSP allows direct calls to
  `api.weatherapi.com`), but must come only from `VITE_WEATHERAPI_KEY` at build time —
  never hardcoded in source, even as a fallback.
