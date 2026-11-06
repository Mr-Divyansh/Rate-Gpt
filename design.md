# Rate GPT — Design Specification

## 1. Direction
Simple, minimal, functional and readable. Mandi prices are the main focus.

## 2. Approved themes

### Light mode
| Token | Value |
|---|---|
| Page background | `#FFFFFF` |
| Surface | `#FFFFFF` |
| Primary text | `#000000` |
| Secondary text | `#404040` |
| Border | `#D9D9D9` |
| Input background | `#FFFFFF` |
| Focus outline | `#000000` |

### Dark mode
| Token | Value |
|---|---|
| Page background | `#111111` |
| Surface | `#1B1B1B` |
| Primary text | `#FFFFFF` |
| Secondary text | `#D0D0D0` |
| Border | `#404040` |
| Input background | `#1B1B1B` |
| Focus outline | `#FFFFFF` |

Use semantic CSS variables. Do not introduce extra accent palettes.

## 3. Typography
Use a clean sans-serif system font. Body text should be comfortably readable (16px baseline). Keep headings clear and price values prominent.

## 4. Layout
Mobile-first, centered content, simple header, compact filter section, search field, results and pagination. Avoid crowded screens.

## 5. Screens
### Home / Mandi Price Board
- Rate GPT header and theme toggle.
- Short page title.
- State, district and market filters.
- Commodity search.
- Results count.
- Desktop price table.
- Mobile stacked price cards.
- Pagination.
- Source attribution and last successful sync.

### Price trend
- Selected crop and market.
- Arrival date and price summary.
- Trend chart only when historical records exist.
- Note explaining that history reflects records stored by Rate GPT.

## 6. Components
Header, ThemeToggle, LocationFilters, CommoditySearch, PriceTable, PriceCard, PriceSummary, TrendChart, Pagination, LoadingState, EmptyState, ErrorState, DataFreshness.

## 7. Interaction
Theme toggle has an accessible label and persists preference where supported. Clear filters resets filters and pagination. Show loading feedback. Do not silently hide errors.

## 8. Accessibility and responsive behavior
Semantic headings, keyboard-operable controls, visible focus, labels for inputs and sufficient contrast. Desktop uses a table; mobile uses cards or a compact horizontally scrollable table.

## 9. Exclusions
No gradients, glassmorphism, neon colours, decorative animations, colourful marketing illustrations or additional themes.
