# Rate GPT — Product Requirements Document

**Version:** 1.0 | **Status:** Draft for MVP

## 1. Overview
Rate GPT is a web application that makes daily agricultural mandi-price records easier to find and understand. It uses the Government Open Data Platform resource associated with AGMARKNET, stores normalized records and serves them through its own backend.

## 2. Problem
Finding crop prices by state, district and mandi can be difficult on complex data portals. Users need a simple way to search, filter and understand reported prices.

## 3. Goals
- Make mandi prices easy to discover.
- Filter by state, district, market and commodity.
- Clearly display min, max and modal prices with arrival date.
- Show historical trends when enough stored data exists.
- Support a simple mobile and desktop experience.

## 4. Target users
Farmers, small agricultural traders, students and market researchers.

## 5. MVP scope
### Required
- Responsive mandi price board.
- State → district → market filters.
- Commodity search.
- Min, max and modal price display.
- Arrival date, source attribution and last-sync time.
- Pagination, loading, empty and error states.
- Light and dark themes.

### Optional for first release
- Historical price chart, only where stored history exists.
- Hindi and English UI labels.

### Out of scope
AI price prediction, buying/selling, payments, logistics, user profiles, push notifications, weather and GPS-based nearby discovery.

## 6. Data source
Dataset: Current Daily Price of Various Commodities from Various Markets (Mandi).  
Resource ID: `9ef84268-d588-465a-a308-a864a43d0070`  
Endpoint: `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`

Expected fields include state, district, market, commodity, variety, grade, arrival date and min/max/modal prices. Confirm exact field names, units, filters and pagination from a successful live response.

The API key must stay on the server in an environment variable. Never put it in frontend code, Git, screenshots or public logs.

## 7. Main user journey
Open app → choose location filters → search commodity → review matching price records → optionally view available historical trend.

## 8. Functional requirements
- Filters can be combined and validated.
- Changing a parent location clears incompatible child filters.
- Search supports partial commodity names.
- Missing values are shown as unavailable, never as zero.
- Price values retain the source unit where known.
- Arrival date and last successful sync time are visible.
- Trends use stored real records; missing dates are not fabricated.

## 9. Non-functional requirements
Responsive, accessible, secure, paginated, validated and resilient to upstream API failures. Avoid presenting stale data as live data.

## 10. Acceptance criteria
- Users can filter by state, district, market and commodity.
- Results are paginated.
- Available source prices and arrival dates are displayed accurately.
- Loading, empty and error states are clear.
- Both themes work on mobile and desktop.
- Government API key is never exposed to the browser.
- Historical chart displays only actual stored records.

## 11. Risks and open questions
Verify API key access, quotas, response schema, source freshness and stable record identity. Historical trends require repeated ingestion. Nearby-mandi functionality needs a separate location strategy and is not part of the initial MVP.
