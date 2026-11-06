# Rate GPT — Design Specification

## 1. Direction
Simple, minimal, functional, and highly readable. Mandi prices are the primary focus of every screen.

## 2. Approved Theme Tokens

### Light Mode
- Page Background: `#FFFFFF`
- Surface Background: `#FFFFFF`
- Primary Text: `#000000`
- Secondary Text: `#404040`
- Border: `#D9D9D9`
- Input Background: `#FFFFFF`
- Focus Outline: `#000000`

### Dark Mode
- Page Background: `#111111`
- Surface Background: `#1B1B1B`
- Primary Text: `#FFFFFF`
- Secondary Text: `#D0D0D0`
- Border: `#404040`
- Input Background: `#1B1B1B`
- Focus Outline: `#FFFFFF`

## 3. Typography
Clean system sans-serif font (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). Monospace font used for numeric figures, currencies, dates, and IDs for tabular clarity.

## 4. UI Elements
- **Price Table**: Clear headers, prominent modal price column with unit, explicit date pill.
- **Mobile Cards**: Stacked view with 3-column price grid (Min / Modal / Max).
- **Comparison View**: Relative spread indicators (+/- ₹ vs average) with warning banners when dates differ.
- **Trend View**: Recharts dual-tone line chart displaying only collected records.
