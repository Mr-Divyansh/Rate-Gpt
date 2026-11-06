# Rate GPT — Product Requirements Document (PRD)

**Version:** 1.0 | **Status:** Implemented

## 1. Overview
Rate GPT is a web application that makes daily agricultural mandi-price records across India easier to find, search, filter, compare, and understand. It interfaces with the Government of India Open Government Data (OGD) Platform / AGMARKNET resource (`9ef84268-d588-465a-a308-a864a43d0070`), stores normalized records, and serves them through its own secure backend.

## 2. Problem Statement
Finding daily agricultural commodity prices by state, district, and APMC mandi on complex governmental data portals is cumbersome for farmers, traders, and researchers. Users need an intuitive, high-performance interface with clear price breakdowns, accurate arrival dates, and market comparison capabilities.

## 3. Core Objectives
- Real-time and stored agricultural mandi price discovery.
- Cascading location filters: State → District → Market.
- Debounced partial-match commodity search with autocomplete.
- Clear distinction between Minimum, Maximum, and Modal prices.
- Transparent reporting of source arrival dates and units (₹/Quintal).
- Historical price movement tracking built exclusively on actual stored observations (never fabricated).
- Strict dual-theme compliance: pure high-contrast light and dark modes.

## 4. Target Audience
- Primary: Farmers, agricultural produce growers, and local APMC mandi traders.
- Secondary: Agricultural researchers, market analysts, and policy students.

## 5. Scope & Features
### Mandi Price Board
- Paginated table (desktop) and stacked cards (mobile).
- Columns: Commodity & Variety, Market/Mandi, State & District, Arrival Date, Min Price, Max Price, Modal Price, Quick Actions.
- Sorting by Arrival Date, Modal Price (high/low), Market name, and Commodity name.

### Market Comparison
- Side-by-side price comparison of the same crop across different mandis.
- Explicit warning banner when records have differing arrival dates.
- High, low, and average modal price KPIs.
- Spread vs average calculation (+/- ₹/Quintal).

### Price Trend Visualization
- Filter by Commodity and Market.
- Visual line chart powered by Recharts showing Modal, Min, and Max price trajectories over verified dates.
- Explicit notice guaranteeing zero fabricated or predicted data points.
- Detailed audit table of all stored observations.

### API & Data Sync Status
- Diagnostics panel showing Government API configuration and status.
- Secure manual sync trigger with optional admin key.
- Audit trail showing sync runs, records fetched, inserted, updated, and error messages.

## 6. Out of Scope
- AI-generated speculative price predictions.
- Weather forecasts.
- GPS/location tracking or map pins.
- User accounts and login walls.
- Payment processing or commodity commerce.
