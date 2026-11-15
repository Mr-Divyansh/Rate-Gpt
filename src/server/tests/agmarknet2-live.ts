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

async function main(): Promise<void> {
  console.log("Checking the public AGMARKNET 2.0 administrative catalogue");

  const response = await fetch(`${BASE_URL}/daily-price-arrival/filters`, {
    headers: HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  check(response.ok, "official filter endpoint returns HTTP success");
  const payload = await response.json() as any;
  check(payload?.status === true && payload?.data, "official filter response has the documented success envelope");

  const states = Array.isArray(payload.data.state_data) ? payload.data.state_data : [];
  const districts = Array.isArray(payload.data.district_data) ? payload.data.district_data : [];
  const markets = Array.isArray(payload.data.market_data) ? payload.data.market_data : [];
  const commodities = Array.isArray(payload.data.cmdt_data) ? payload.data.cmdt_data : [];
  check(states.some((row: any) => row.state_name === "Himachal Pradesh"), "official catalogue contains Himachal Pradesh");
  check(districts.length > 0 && markets.length > 0 && commodities.length > 0, "official catalogue contains district, mandi and commodity directories");

  const hp = states.find((row: any) => row.state_name === "Himachal Pradesh");
  const hpDistricts = districts.filter((row: any) => row.state_id === hp.state_id);
  const hpMarkets = markets.filter((row: any) => row.state_id === hp.state_id && Number.isInteger(row.id));
  const potato = commodities.find((row: any) => row.cmdt_name === "Potato");
  check(hpDistricts.length > 0 && hpMarkets.length > 0, "Himachal Pradesh has registered districts and mandis");
  check(Boolean(potato), "official catalogue contains a Potato commodity selector");

  console.log(
    `AGMARKNET 2.0 directory: ${states.length} states/UTs; Himachal Pradesh: ${hpDistricts.length} districts, ${hpMarkets.length} registered mandis; ${commodities.length} commodities.`,
  );
  console.log("INFO CAPTCHA-gated price-report endpoints are intentionally not automated. Price observations continue to come from the key-authenticated OGD API.");
}

main().catch((error) => {
  console.error("AGMARKNET 2.0 public catalogue verification failed:", error);
  process.exitCode = 1;
});
