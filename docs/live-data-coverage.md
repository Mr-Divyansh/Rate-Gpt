# Live mandi data coverage and source limitations

## Current price source

Rate-GPT fetches price observations on demand from the Government of India's OGD resource:

- Resource: `9ef84268-d588-465a-a308-a864a43d0070`
- Dataset: Current Daily Price of Various Commodities from Various Markets (Mandi)
- Publisher: Ministry of Agriculture and Farmers Welfare / Directorate of Marketing and Inspection
- Price fields: minimum, maximum and modal price, with the reported arrival date

Price observations are not stored in a database. The API's `meta.total` is the number of records returned by the selected OGD query, not the number of registered mandis in that state.

## Administrative directory

The public AGMARKNET 2.0 filters endpoint is used for the administrative selectors:

`https://api.agmarknet.gov.in/v1/daily-price-arrival/filters`

It provides the state, district, market and commodity directory. Rate-GPT caches this directory in process memory for 15 minutes. This cache does not apply to price records.

A market appearing in the directory means it is registered in the directory. It does not mean that the market published a price observation on the requested date. The UI must distinguish registered markets from markets with returned price records.

## Historical date availability

The OGD resource includes an `arrival_date` value on returned observations, but that field is not exposed as a reliable query filter by the public resource API. A date parameter can therefore be ignored upstream; filtering only the first returned page would incorrectly make older observations appear missing.

Rate-GPT does not store price history and does not crawl every page to simulate a historical archive. The Mandi Prices page consequently has no arbitrary date picker. It displays the exact arrival date attached to each observation returned by the live API. If the source returns an older arrival date because a market reported late, that real source date remains visible.

The AGMARKNET 2.0 historical/report endpoints tested by this project require a CAPTCHA token and are not automated. No CAPTCHA is bypassed and no historical prices are generated.

## CAPTCHA-protected price reports

The AGMARKNET 2.0 daily market-report and date-wise commodity-report endpoints were tested from the CI runner. The price-report endpoint returned HTTP 400 with:

`TOKEN_OR_CAPTCHA_REQUIRED`

Those endpoints are therefore not automated by Rate-GPT. The application does not attempt to solve, bypass or fabricate CAPTCHA values. The public directory endpoint remains usable, while price observations continue to come from the key-authenticated OGD resource.

## Price-unit provenance

The OGD resource response used by Rate-GPT does not include a per-record unit field. When the upstream record does not provide a unit, Rate-GPT returns `Not provided by source`. It does not assume `Rs/Quintal`, convert to per-kilogram prices, or compare records whose units are unknown.

When an upstream source explicitly provides a unit, that unit is preserved and conversions/comparisons are limited to compatible units.

## Coverage semantics

- Root filter metadata is an administrative catalogue, not a price-coverage scan.
- State-scoped filter metadata describes registered districts and markets from the AGMARKNET directory.
- Price totals and pagination describe only the actual OGD price rows returned by the upstream source.
- Missing price rows are not synthesized. A registered market without a returned observation must remain visibly without a price.
- Commodity suggestions come from the government catalogue, while displayed prices still require an actual price observation.

## What is needed for wider price coverage

To show latest available observations across more markets and dates without CAPTCHA automation, Rate-GPT needs another official government data resource/API that provides those price observations through an unattended, documented access method. Until such a source is verified, the application must report the OGD feed's actual coverage rather than claim complete statewide price coverage.
