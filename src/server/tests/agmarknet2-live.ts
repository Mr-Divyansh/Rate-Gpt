const BASE_URL = "https://api.agmarknet.gov.in/v1";
const HEADERS = {
  Accept: "application/json",
  Origin: "https://agmarknet.gov.in",
  Referer: "https://agmarknet.gov.in/",
  "User-Agent": "RateGPT/1.0 (https://rate-gpt.vercel.app; public mandi price discovery)",
};

function check(condition: boolean, label: string): void {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}

function indiaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  console.log("Checking the public AGMARKNET 2.0 API");

  const filtersResponse = await fetch(`${BASE_URL}/daily-price-arrival/filters`, {
    headers: HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  check(filtersResponse.ok, "official filter endpoint returns HTTP success");
  const filters = await filtersResponse.json() as any;
  check(filters?.status === true && filters?.data, "official filter response has the documented success envelope");

  const states = Array.isArray(filters.data.state_data) ? filters.data.state_data : [];
  const districts = Array.isArray(filters.data.district_data) ? filters.data.district_data : [];
  const markets = Array.isArray(filters.data.market_data) ? filters.data.market_data : [];
  const commodities = Array.isArray(filters.data.cmdt_data) ? filters.data.cmdt_data : [];
  check(states.some((row: any) => row.state_name === "Himachal Pradesh"), "official catalogue contains Himachal Pradesh");
  check(districts.length > 0 && markets.length > 0 && commodities.length > 0, "official catalogue contains district, mandi and commodity directories");

  const hp = states.find((row: any) => row.state_name === "Himachal Pradesh");
  const hpMarkets = markets.filter((row: any) => row.state_id === hp.state_id && Number.isInteger(row.id));
  check(hpMarkets.length > 0, "Himachal Pradesh has registered mandis in the official directory");

  const date = shiftDate(indiaToday(), -2);
  const reportResponse = await fetch(`${BASE_URL}/prices-and-arrivals/market-report/daily`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      date,
      marketIds: hpMarkets.map((row: any) => row.id),
      stateIds: [hp.state_id],
      includeExcel: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  check(reportResponse.ok, "official daily mandi report endpoint returns HTTP success");
  const report = await reportResponse.json() as any;
  check(Array.isArray(report?.states), "daily report contains the expected state collection");

  const stateReport = report.states.find((row: any) =>
    row.stateId === hp.state_id || row.stateName === "Himachal Pradesh"
  );
  const reportedMarkets = Array.isArray(stateReport?.markets) ? stateReport.markets : [];
  const priceRows = reportedMarkets.flatMap((market: any) =>
    (Array.isArray(market.commodities) ? market.commodities : []).flatMap((commodity: any) =>
      Array.isArray(commodity.data) ? commodity.data : []
    )
  );
  console.log(`AGMARKNET report date: ${date}; registered HP mandis: ${hpMarkets.length}; reporting mandis: ${reportedMarkets.length}; price rows: ${priceRows.length}`);
  if (priceRows.length > 0) {
    const sample = priceRows.find((row: any) => row.modalPrice !== null && row.modalPrice !== undefined);
    check(Boolean(sample), "daily report includes at least one modal price observation");
    check(typeof sample?.unitOfPrice === "string" && sample.unitOfPrice.trim().length > 0, "daily report provides the source price unit");
  } else {
    console.log("INFO No price rows were reported for Himachal Pradesh on the sampled date; directory and report API access were verified.");
  }
}

main().catch((error) => {
  console.error("AGMARKNET 2.0 live verification failed:", error);
  process.exitCode = 1;
});
