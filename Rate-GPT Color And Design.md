# Rate GPT --- Design System

**Document:** `design.md`\
**Status:** Initial visual direction approved\
**Version:** 1.0\
**Date:** 31 October 2026

## 1. Product Design Direction

Rate GPT is an agricultural market-intelligence platform intended to
make mandi information easier to understand and use.

**Design direction:** Premium & Professional + Modern Agriculture Tech.

The interface should feel: - Trustworthy and dependable - Agricultural
without looking outdated - Modern and data-driven - Clear and
approachable for farmers - Simple to use on desktop and mobile

## 2. Approved Colour Palette

  Role              Colour name     HEX
  ----------------- --------------- -----------
  Primary           Forest Green    `#174D38`
  Secondary         Natural Green   `#287A52`
  Page background   Warm Ivory      `#F7F7F0`
  Surface / cards   White           `#FFFFFF`
  Accent            Harvest Gold    `#E9A23B`
  Main text         Deep Charcoal   `#202B25`

### Suggested supporting colours

These are practical UI support colours, not replacements for the
approved palette.

  -----------------------------------------------------------------------
  Role                    HEX                     Usage
  ----------------------- ----------------------- -----------------------
  Muted text              `#66736B`               Secondary labels and
                                                  descriptions

  Borders                 `#E5E9E2`               Card and input borders

  Soft green surface      `#EAF2EC`               Selected states and
                                                  subtle highlights

  Success                 `#287A52`               Positive status

  Warning                 `#B7791F`               Caution and pending
                                                  states

  Error                   `#B5473C`               Errors and destructive
                                                  states
  -----------------------------------------------------------------------

## 3. Colour Usage Rules

-   Use Forest Green (`#174D38`) for primary buttons, active navigation,
    key actions and important headings.
-   Use Natural Green (`#287A52`) for secondary actions, positive
    indicators and supporting emphasis.
-   Use Warm Ivory (`#F7F7F0`) as the main page background.
-   Use White (`#FFFFFF`) for cards, tables, panels and form surfaces.
-   Use Harvest Gold (`#E9A23B`) sparingly for price highlights,
    important notices and small visual accents.
-   Use Deep Charcoal (`#202B25`) for primary text.
-   Keep text contrast strong and never use the gold accent for long
    body text.
-   Do not make every component green. Preserve visual hierarchy with
    neutral surfaces.

## 4. Visual Style

-   Clean, structured layouts with generous spacing.
-   Subtle borders and soft, restrained shadows.
-   Consistent corner radii; avoid excessively rounded components.
-   Clear typography and readable data tables.
-   Minimal gradients; no neon colours or unnecessary decoration.
-   Use icons only when they improve recognition or navigation.
-   Prioritize responsive layouts and touch-friendly controls.

## 5. Data and Price Presentation

Mandi prices and market comparisons are core information: - Make crop
names, mandi names, dates and units explicit. - Display price units
consistently (for example, ₹/quintal where applicable). - Distinguish
current prices from previous prices and trends. - Never rely on colour
alone to communicate price movement; include labels or icons. - Show the
data date/source where available so users can judge freshness. - Use
clear loading, empty, stale-data and error states.

## 6. Accessibility and Usability

-   Maintain readable text sizes and sufficient contrast.
-   Use clear Hindi/English labels where the product requires them.
-   Keep forms short and explain unfamiliar terms.
-   Make important actions easy to find on smaller screens.
-   Provide visible focus states and accessible button labels.
-   Do not communicate success, warning or error using colour alone.

## 7. CSS Design Tokens

``` css
:root {
  --color-primary: #174D38;
  --color-secondary: #287A52;
  --color-background: #F7F7F0;
  --color-surface: #FFFFFF;
  --color-accent: #E9A23B;
  --color-text: #202B25;

  --color-muted: #66736B;
  --color-border: #E5E9E2;
  --color-soft-green: #EAF2EC;
  --color-success: #287A52;
  --color-warning: #B7791F;
  --color-error: #B5473C;
}
```

## 8. Brand Line

**Rate GPT --- Connecting Farmers to Better Market Intelligence.**

## 9. Decisions and Open Items

### Finalized

-   Product colour direction: Forest Green + Warm Ivory
-   Primary palette and core colour roles
-   Overall visual direction: premium, professional and
    agriculture-focused

### To decide in later design discussions

-   Typography and font pairing
-   Logo and brand mark
-   Navigation structure
-   Page layouts and dashboard hierarchy
-   Buttons, inputs, cards, tables and chart components
-   Mobile-specific patterns
-   Detailed page-by-page UI

------------------------------------------------------------------------

**Implementation note:** Treat this document as the current visual
baseline. Do not invent a new colour palette or redesign the brand
direction without an explicit project decision.
