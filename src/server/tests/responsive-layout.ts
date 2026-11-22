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

  const [home, prices, weather, baseCss, pricesCss, homeCss, weatherCss, globalNav, mandiScript, weatherScript, onboardingScript, onboardingCss, mandiNavGuideScript, mandiNavGuideCss, homePreviewScript, i18n] = await Promise.all([
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
    readFile("script/home-market-preview.js", "utf8"),
    readFile("script/i18n.js", "utf8"),
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

  check(onboardingScript.includes("onboarding-continue") &&
    /class="btn btn-primary onboarding-continue" type="button"/.test(onboardingScript) &&
    /dialog\.querySelector\("\.onboarding-skip"\)\.addEventListener\("click",[\s\S]*?shouldStartWebsiteGuide = false;[\s\S]*?markWelcomeSeen\(\);[\s\S]*?dialog\.close\(\);[\s\S]*?dialog\.remove\(\);/.test(onboardingScript) &&
    /markWelcomeSeen\(\);[\s\S]*?dialog\.close\(\);[\s\S]*?if \(shouldStartWebsiteGuide\) startMandiNavGuide\(\)/.test(onboardingScript) &&
    onboardingScript.includes('window.localStorage.setItem("rateGptWelcomeSeen", "1")') &&
    !onboardingScript.includes('href="mandi-prices.html"') &&
    !onboardingScript.includes("onboarding-farmer-cta") &&
    !onboardingScript.includes("onboarding-finish") &&
    !onboardingScript.includes("onboarding-close") &&
    !onboardingScript.includes("showMandiPricesGuide") &&
    !onboardingScript.includes("hero-mandi-guide") &&
    onboardingCss.includes("display: none !important") &&
    onboardingCss.includes("Final step: centered farmer artwork"),
    "final intro step centers the farmer, removes the speech bubble and closes the dialog on Continue");
  check(home.includes('/script/mandi-nav-guide.js') &&
    onboardingScript.includes('import { startMandiNavGuide } from "./mandi-nav-guide.js"') &&
    onboardingScript.includes("shouldStartWebsiteGuide = true") &&
    onboardingScript.includes("if (shouldStartWebsiteGuide) startMandiNavGuide()") &&
    onboardingScript.includes("shouldStartWebsiteGuide = false") &&
    mandiNavGuideScript.includes("export function startMandiNavGuide()") &&
    mandiNavGuideScript.includes("Characte_For_RateGPT_Point.png") &&
    mandiNavGuideScript.includes('pricesLink.classList.add("is-guide-highlighted")') &&
    mandiNavGuideScript.includes('action.href = "mandi-prices.html"') &&
    mandiNavGuideScript.includes("--spot-x") &&
    mandiNavGuideScript.includes("Click the highlighted Mandi prices tab") &&
    mandiNavGuideScript.includes("onLangChange(syncLanguage)") &&
    mandiNavGuideCss.includes("rgba(9, 22, 15, .68)") &&
    mandiNavGuideCss.includes("ellipse 86px 37px") &&
    !mandiNavGuideScript.includes("mandi-nav-guide__close") &&
    !mandiNavGuideCss.includes("mandi-nav-guide__close") &&
    mandiNavGuideCss.includes("background: #fffdf6") &&
    mandiNavGuideCss.includes("background: #fff") &&
    mandiNavGuideCss.includes("color: #17251c"),
    "Continue launches a dimmed spotlight with a white instruction bubble and pointing farmer; Skip does not");
  check(mandiNavGuideScript.includes("const mobile = window.innerWidth <= 720") &&
    mandiNavGuideScript.includes("Math.min(380, window.innerWidth - 32)") &&
    mandiNavGuideScript.includes("(window.innerWidth - bubbleWidth) / 2") &&
    mandiNavGuideScript.includes("window.visualViewport?.height || window.innerHeight") &&
    mandiNavGuideCss.includes("@media (max-width: 720px)") &&
    mandiNavGuideCss.includes("width: 138px") &&
    mandiNavGuideCss.includes("font-size: .82rem") &&
    mandiNavGuideCss.includes("@media (max-width: 380px)"),
    "mobile spotlight uses a centered compact bubble, smaller action text and scaled farmer");

  check(!globalNav.includes("function demoMenu()") &&
    !globalNav.includes("demo-menu-trigger") &&
    globalNav.includes("actions.append(languageToggle(), toggle)") &&
    globalNav.includes('const DEVICE_VISIT_KEY = "rateGptDeviceVisited"') &&
    globalNav.includes('window.localStorage.getItem(DEVICE_VISIT_KEY) === "1"') &&
    globalNav.includes('window.localStorage.getItem("rateGptWelcomeSeen") === "1"') &&
    globalNav.includes('window.localStorage.getItem("rategpt.lang") !== null') &&
    globalNav.includes("if (!hasVisitedSite && currentPage === \"index.html\"") &&
    globalNav.includes("showFirstVisitWelcome();") &&
    onboardingScript.includes('window.localStorage.setItem("rateGptDeviceVisited", "1")'),
    "welcome onboarding appears only on a new browser profile's first site visit and stays dismissed on returning devices");
  check(home.includes('href="style/mandi-nav-guide.css"') &&
    mandiNavGuideCss.includes(".mandi-nav-guide") &&
    onboardingCss.includes(".onboarding-farmer-cta") &&
    onboardingCss.includes("background: #0d7048") &&
    onboardingCss.includes("@media (max-width: 700px)") &&
    onboardingCss.includes("prefers-reduced-motion: reduce") &&
    mandiNavGuideCss.includes(".mandi-nav-guide__action") &&
    mandiNavGuideCss.includes("color: #17251c") &&
    mandiNavGuideCss.includes("background: #fff"),
    "farmer speech bubble and on-demand navigation guide use Rate-GPT green with mobile and reduced-motion support");
  check(home.includes('id="demoTutorialAgain"') &&
    home.includes('data-i18n="demo.viewTutorialAgain"') &&
    home.includes('href="mandi-prices.html"') &&
    home.includes('data-src="https://www.youtube-nocookie.com/embed/AsImBHSFDtI?rel=0"') &&
    !home.includes('src="https://www.youtube-nocookie.com/embed/AsImBHSFDtI?rel=0"') &&
    home.includes('title="Rate-GPT video demo"') &&
    home.includes('allowfullscreen') &&
    home.includes('loading="lazy"') &&
    !home.includes("demo-video-placeholder"),
    "homepage demo dialog embeds the supplied YouTube walkthrough with accessible, lazy-loaded playback");
  check(homePreviewScript.includes('demoVideo.setAttribute("src", demoVideo.dataset.src)') &&
    homePreviewScript.includes('demoDialog?.addEventListener("close", stopDemoVideo)') &&
    homePreviewScript.includes('demoVideo?.removeAttribute("src")'),
    "closing the demo dialog unloads the YouTube iframe and reopening it restores playback");
  check(homePreviewScript.includes('import { showFirstVisitWelcome } from "./onboarding.js"') &&
    /\$\("demoTutorialAgain"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*\{[\s\S]*?demoDialog\.close\(\)[\s\S]*?showFirstVisitWelcome\(\)/.test(homePreviewScript) &&
    !homePreviewScript.includes("DEMO_VIDEO_SRC"),
    "View tutorial again closes the demo dialog and restarts the complete Namaste welcome flow");
  check(i18n.includes('"demo.viewTutorialAgain": "View tutorial again"') &&
    i18n.includes('"demo.viewTutorialAgain": "ट्यूटोरियल फिर से देखें"') &&
    i18n.includes('"demo.exploreLivePrices": "Explore live prices"') &&
    i18n.includes('"demo.exploreLivePrices": "लाइव मंडी भाव देखें"'),
    "demo dialog actions have English and Hindi translations");
  check(homeCss.includes(".demo-video-placeholder") &&
    homeCss.includes(".demo-tutorial-again") &&
    homeCss.includes("background: transparent") &&
    homeCss.includes("@media (max-width: 620px)"),
    "demo placeholder and transparent tutorial action have responsive styling");

  check(!baseCss.includes(".demo-menu-trigger") &&
    !baseCss.includes(".demo-menu-panel"),
    "unused Demo dropdown styles are removed from the shared header stylesheet");

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
