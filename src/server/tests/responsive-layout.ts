import { readFile } from "node:fs/promises";

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS ${label}`);
    passed += 1;
  } else {
    console.error(`  FAIL ${label}`);
    failed += 1;
  }
}

async function main() {
  console.log("\nRate-GPT responsive layout regression checks");

  const [home, prices, weather, baseCss, pricesCss, homeCss, weatherCss, globalNav, mandiScript, weatherScript, onboardingScript, onboardingCss, mandiNavGuideScript, mandiNavGuideCss] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("mandi-prices.html", "utf8"),
    readFile("weather.html", "utf8"),
    readFile("style/base.css", "utf8"),
    readFile("style/mandi-prices.css", "utf8"),
    readFile("style/style.css", "utf8"),
    readFile("style/weather.css", "utf8"),
    readFile("script/global-nav.js", "utf8"),
    readFile("script/mandi-prices.js", "utf8"),
    readFile("script/weather.js", "utf8"),
    readFile("script/onboarding.js", "utf8"),
    readFile("style/onboarding.css", "utf8"),
    readFile("script/mandi-nav-guide.js", "utf8"),
    readFile("style/mandi-nav-guide.css", "utf8"),
  ]);

  for (const [file, html] of [["index.html", home], ["mandi-prices.html", prices]] as const) {
    check(/<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?"/i.test(html),
      `${file}: responsive viewport metadata`);
    check(/<a class="skip-link" href="#main-content"/.test(html),
      `${file}: keyboard skip navigation`);
  }

  check(/<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?"/i.test(weather),
    "weather.html: responsive viewport metadata");
  check(/<a class="skip-link" href="#main-content"/.test(weather),
    "weather.html: keyboard skip navigation");
  check(/id="useMyLocationBtn"/.test(weather) && /id="useApproxLocationBtn"/.test(weather),
    "weather page exposes separate device and approximate location actions");
  check(/id="weatherStatus" role="status"/.test(weather) && /id="weatherError" role="alert"/.test(weather),
    "weather page announces loading and error states accessibly");
  check(/@media\s*\(max-width:\s*650px\)[\s\S]*?\.weather-location-actions\s*\{[^}]*flex-direction:column/s.test(weatherCss),
    "weather location actions stack on narrow screens");
  check(/@media\s*\(max-width:\s*650px\)[\s\S]*?\.weather-search-control input\s*\{[^}]*padding:0 13px/s.test(weatherCss) &&
    /@media\s*\(max-width:\s*650px\)[\s\S]*?\.weather-search-control>\.btn\s*\{\s*position:static;\s*width:100%/s.test(weatherCss),
    "weather search input and action use a single-column mobile layout");
  check(/locationButton\.addEventListener\("click",\s*useDeviceLocation\)/.test(weatherScript) &&
    /navigator\.geolocation\.getCurrentPosition\(/.test(weatherScript) &&
    /enableHighAccuracy\s*:\s*false/.test(weatherScript) &&
    /timeout\s*:\s*6000/.test(weatherScript) &&
    /maximumAge\s*:\s*300000/.test(weatherScript) &&
    /fetchWeather\("auto:ip","approximate"\)/.test(weatherScript) &&
    !/navigator\.geolocation\.watchPosition\(/.test(weatherScript),
    "one-shot device location uses balanced accuracy, a bounded timeout and opt-in approximate lookup");

  check(onboardingScript.includes("onboarding-farmer-cta") &&
    onboardingScript.includes('href="mandi-prices.html"') &&
    !onboardingScript.includes("onboarding-finish") &&
    !onboardingScript.includes("onboarding-close") &&
    !onboardingScript.includes("showMandiPricesGuide") &&
    !onboardingScript.includes("hero-mandi-guide"),
    "final intro step uses the farmer speech bubble as its only action and has no close or footer button");
  check(home.includes('/script/mandi-nav-guide.js') &&
    mandiNavGuideScript.includes("export function startMandiNavGuide()") &&
    mandiNavGuideScript.includes("Characte_For_RateGPT_Point.png") &&
    mandiNavGuideScript.includes('pricesLink.classList.add("is-guide-highlighted")') &&
    mandiNavGuideScript.includes('action.href = "mandi-prices.html"') &&
    mandiNavGuideScript.includes('close.addEventListener("click", stopGuide)') &&
    mandiNavGuideScript.includes("onLangChange(syncLanguage)"),
    "website tutorial is started on demand, highlights Mandi Prices and exposes close only while active");
  check(globalNav.includes("function demoMenu()") &&
    globalNav.includes("Website tutorial") &&
    globalNav.includes("startMandiNavGuide()") &&
    globalNav.includes("actions.append(demoMenu(), languageToggle(), toggle)"),
    "shared header places a Demo menu before language controls and launches Website tutorial");
  check(home.includes('href="style/mandi-nav-guide.css"') &&
    mandiNavGuideCss.includes(".mandi-nav-guide") &&
    mandiNavGuideCss.includes(".mandi-nav-guide__close") &&
    onboardingCss.includes(".onboarding-farmer-cta") &&
    onboardingCss.includes("background: #0d7048") &&
    onboardingCss.includes("@media (max-width: 700px)") &&
    onboardingCss.includes("prefers-reduced-motion: reduce") &&
    mandiNavGuideCss.includes('content: "CLICK HERE"') &&
    mandiNavGuideCss.includes("color: #075e3d") &&
    mandiNavGuideCss.includes("background: #e9f6ed"),
    "farmer speech bubble and on-demand navigation guide use Rate-GPT green with mobile and reduced-motion support");
  check(baseCss.includes(".demo-menu-trigger") &&
    baseCss.includes(".demo-menu-panel") &&
    baseCss.includes("@media (max-width: 720px)"),
    "Demo dropdown remains usable beside language controls on narrow screens");

  check(/\.menu-toggle\s*\{[^}]*display:none/s.test(baseCss), "desktop navigation toggle is hidden by default");
  check(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.menu-toggle\s*\{\s*display:block/s.test(baseCss),
    "mobile navigation exposes its menu toggle");
  check(/\.site-nav\s*\{[\s\S]*?grid-column:auto;\s*grid-row:auto;\s*order:initial;/s.test(baseCss),
    "mobile drawer resets inherited horizontal-nav grid placement");
  check(/\.site-nav\s*\{[\s\S]*?margin:0;/s.test(baseCss),
    "mobile drawer resets inherited negative horizontal margins");
  check(/\.site-nav\.is-open\s*\{[^}]*transform:translateX\(0\);\s*visibility:visible;/s.test(baseCss),
    "mobile drawer has an explicit open state");
  check(/\.nav-backdrop\.is-visible\s*\{[^}]*pointer-events:auto;/s.test(baseCss),
    "mobile drawer backdrop receives pointer input only when visible");

  check(/\.price-table\s*\{[^}]*min-width:\s*760px;/s.test(pricesCss),
    "desktop price table retains a readable minimum width");
  check(/@media\s*\(max-width:\s*820px\)[\s\S]*?\.table-wrap\s*\{\s*display:\s*none;\s*\}[\s\S]*?\.mobile-list\s*\{\s*display:\s*grid;/s.test(pricesCss),
    "small screens switch from wide table to mobile price cards");
  check(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.page-prices \.toolbar\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\);/s.test(pricesCss),
    "mobile filter toolbar uses a single-column layout");
  check(/@media\s*\(max-width:\s*420px\)[\s\S]*?\.page-home \.hero-actions \.btn\s*\{\s*width:\s*100%;/s.test(homeCss),
    "narrow homepage stacks full-width primary actions");
  check(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(baseCss) &&
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(homeCss),
    "shared and homepage styles respect reduced-motion preferences");

  check(/setAttribute\("aria-expanded","false"\)/.test(globalNav) &&
    /setAttribute\("aria-controls","primaryNavigation"\)/.test(globalNav),
    "mobile navigation toggle exposes its controlled menu state");
  check(/e\.key === "Escape"[\s\S]*?close\(\{ restoreFocus: true \}\)/.test(globalNav),
    "Escape closes the mobile drawer and restores focus to its trigger");
  check(/backdrop\.addEventListener\("click", \(\) => close\(\{ restoreFocus: true \}\)\)/.test(globalNav),
    "backdrop dismissal restores keyboard focus to the menu trigger");
  check(/e\.shiftKey[\s\S]*?last\.focus\(\)[\s\S]*?first\.focus\(\)/.test(globalNav),
    "mobile drawer keeps keyboard focus within navigation while open");

  const priceTableColumns = (prices.match(/<th\s+scope="col"/g) || []).length;
  check(priceTableColumns === 5 && /td\.colSpan = 5;/.test(mandiScript),
    "empty, loading and error table messages span the exact five visible price columns");

  console.log(`\nResponsive layout checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Responsive layout checks could not complete:", error);
  process.exitCode = 1;
});
