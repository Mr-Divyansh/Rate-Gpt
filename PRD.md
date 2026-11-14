# Product requirements

The core journey is: choose a state, choose a district, choose a mandi, optionally search a crop or choose an arrival date, then review live government records. The site must work on desktop and mobile, make missing values explicit, preserve source dates and units, show loading/empty/error states, and never present a failed upstream request as data.

State, district, and market discovery is source-backed and may be bounded by the upstream API. Historical charts are out of scope because Rate-GPT deliberately does not retain price records.
