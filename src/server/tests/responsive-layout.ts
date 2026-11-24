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

  const [home, prices, weather, baseCss, pricesCss, homeCss, weatherCss, globalNav, mandiScript, weatherScript, onboardingScript, onboardingCss, mandiNavGuideScript, finderTourScript, finderTourCss, mandiNavGuideCss, homePreviewScript, i18n] = await Promise.all([
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
    readFile("script/mandi-finder-guide.js", "utf8"),
    readFile("style/mandi-finder-guide.css", "utf8"),
    readFile("style/mandi-nav-guide.css", "utf8"),
    readFile("script/home-market-preview.js", "utf8"),
    readFile("script/i18n.js", "utf8"),
  ]);

  const { calculateSpotlightGeometry } = await import("../../../script/mandi-nav-guide.js" as string);

  for (const [file, html] of [["index.html", home], ["mandi-prices.html", prices]] as const) {
    check(/<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?"/i.test(html),
      `${file}: responsive viewport metadata`);
    check(/<a class="skip-link" href="#main-content"/.test(html),
      `${file}: keyboard skip navigation`);
  }
  check(/data-async-fonts/.test(home) && !/\sonload=/.test(home) &&
    /link\[data-async-fonts\][\s\S]*?asyncFontStylesheet\.media = "all"/.test(globalNav),
    "homepage font stylesheet avoids a CSP-blocked inline load handler");

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
  check(/@media\s*\(max-width:\s*650px\)[\s\S]*?\.weather-search-control input\s*\{[^}]*padding:\s*0\s+13px/s.test(weatherCss) &&
    /@media\s*\(max-width:\s*650px\)[\s\S]*?\.weather-search-control\s*>\s*\.btn\s*\{[^}]*position:\s*static;[^}]*width:\s*100%/s.test(weatherCss),
    "weather search input and action use a single-column mobile layout");
  check(/locationButton\.addEventListener\("click",\s*useDeviceLocation\)/.test(weatherScript) &&
    /navigator\.geolocation\.getCurrentPosition\(/.test(weatherScript) &&
    /enableHighAccuracy\s*:\s*false/.test(weatherScript) &&
    /timeout\s*:\s*3000/.test(weatherScript) &&
    /maximumAge\s*:\s*600000/.test(weatherScript) &&
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
  check(prices.includes('/style/mandi-finder-guide.css') &&
    prices.includes('/script/mandi-finder-guide.js') &&
    mandiNavGuideScript.includes('mandi-prices.html?startFinderTutorial=1') &&
    mandiNavGuideScript.includes('sessionStorage.setItem("rateGptStartFinderTutorial", "1")') &&
    finderTourScript.includes('sessionStorage.getItem("rateGptStartFinderTutorial") === "1"') &&
    finderTourScript.includes('params.get(TOUR_PARAM) !== "1"') &&
    finderTourScript.includes('function centerTarget(target)') &&
    finderTourScript.includes('target.scrollIntoView({ behavior, block: "center", inline: "nearest" })') &&
    finderTourScript.includes('centerTarget(activeTarget)') &&
    finderTourScript.includes('Choose your state') &&
    finderTourScript.includes('Select your district') &&
    finderTourScript.includes('Pick a mandi') &&
    finderTourScript.includes('Your mandi prices are here') &&
    finderTourScript.includes('if (step === 4) return results;') &&
    !finderTourScript.includes('if (step === 4) return pricesHeading;') &&
    finderTourScript.includes('Characte_For_RateGPT_Namaste.png') &&
    finderTourScript.includes('Thanks for completing the tour!') &&
    finderTourScript.includes('Need a hand? Your Farmer Assistant is right here.') &&
    finderTourScript.includes('Close tutorial') &&
    finderTourCss.includes('mandi-tour-water') &&
    finderTourCss.includes('pointer-events: auto') &&
    finderTourCss.includes('prefers-reduced-motion: reduce') &&
    finderTourScript.includes('You’re all set!') &&
    finderTourScript.includes('अब मंडी भाव देखना शुरू करें!') &&
    finderTourScript.includes('const stackHeight = farmerHeight + gap + panelHeight;') &&
    finderTourScript.includes('panel.style.maxHeight = Math.max(150, viewportHeight - farmerHeight - gap - 24) + "px";') &&
    finderTourCss.includes('overflow-y: auto;') &&
    finderTourCss.includes('@media (max-height: 620px)'),
    "guided finder tour ends with concise bilingual thank-you copy and a vertically stacked, scroll-safe mobile layout");

  check(mandiNavGuideScript.includes("const mobile = viewportWidth <= 720") &&
    mandiNavGuideScript.includes("Math.min(380, viewportWidth - 32)") &&
    mandiNavGuideScript.includes("(viewportWidth - bubbleWidth) / 2") &&
    mandiNavGuideScript.includes("window.visualViewport?.height || window.innerHeight") &&
    mandiNavGuideCss.includes("@media (max-width: 720px)") &&
    mandiNavGuideCss.includes("width: 138px") &&
    mandiNavGuideCss.includes("font-size: .82rem") &&
    mandiNavGuideCss.includes("@media (max-width: 380px)"),
    "mobile spotlight uses a centered compact bubble, smaller action text and scaled farmer");
  check(mandiNavGuideScript.indexOf('pricesLink.classList.add("is-guide-highlighted")') <
      mandiNavGuideScript.indexOf("const rect = pricesLink.getBoundingClientRect()") &&
    mandiNavGuideScript.includes('siteNav?.addEventListener("transitionend", onDrawerTransitionEnd)') &&
    mandiNavGuideScript.includes('event.propertyName === "transform"') &&
    mandiNavGuideScript.includes("drawerFallbackTimer = window.setTimeout(schedulePositionGuide, 400)") &&
    mandiNavGuideScript.includes('guide.style.setProperty("--spot-rx", geometry.radiusX + "px")') &&
    mandiNavGuideCss.includes("ellipse var(--spot-rx, 150px) var(--spot-ry, 38px)") &&
    mandiNavGuideCss.includes("width: 100%") &&
    mandiNavGuideCss.includes("background: #f1fff6") &&
    mandiNavGuideCss.includes("0 0 0 4px rgba(8, 117, 79, .22)") &&
    mandiNavGuideCss.includes("transform: none") &&
    mandiNavGuideCss.includes('content: "→"') &&
    mandiNavGuideCss.includes(".mandi-nav-guide.is-landscape .mandi-nav-guide__farmer") &&
    mandiNavGuideScript.includes("bubbleViewportHeight - copy.offsetHeight - 104 - 24"),
    "spotlight waits for drawer animation, measures the final row and avoids short-landscape overlap");

  for (const width of [320, 360, 375, 390, 412, 430]) {
    const drawerWidth = Math.min(width * 0.86, 340);
    const rowWidth = drawerWidth - 40;
    const rect = { left: width - drawerWidth + 20, top: 112, width: rowWidth, height: 56 };
    const geometry = calculateSpotlightGeometry(rect, width, 800);
    const left = geometry.centerX - geometry.radiusX;
    const right = geometry.centerX + geometry.radiusX;
    check(Math.abs(geometry.centerX - (rect.left + rect.width / 2)) < 0.001 &&
      Math.abs(geometry.centerY - (rect.top + rect.height / 2)) < 0.001,
      `${width}px: spotlight center matches the measured Mandi Prices row`);
    check(left >= 10 - 0.001 && right <= width - 10 + 0.001,
      `${width}px: spotlight radius stays within viewport gutters`);
    check(geometry.radiusX >= 0 && Math.abs((geometry.centerX - left) - (right - geometry.centerX)) < 0.001,
      `${width}px: mobile spotlight glow is symmetrical`);
  }

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
    !home.includes('        src="https://www.youtube-nocookie.com/embed/AsImBHSFDtI?rel=0"') &&
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
  check(/\.site-nav\s*\{[\s\S]*?clip-path:\s*inset\(0 0 0 100%\);[\s\S]*?visibility:\s*hidden;/s.test(baseCss),
    "closed mobile drawer is clipped in place to prevent horizontal overflow");
  check(/\.site-nav\.is-open\s*\{[^}]*clip-path:\s*inset\(0\);[\s\S]*?visibility:\s*visible;/s.test(baseCss),
    "mobile drawer has an explicit visible state without off-canvas transforms");
  check(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.page-home\s+\.hero-farmer\s*\{[^}]*top:\s*150px;[\s\S]*?right:\s*-3%;/s.test(homeCss),
    "mobile farmer artwork stays within the viewport edge");
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

  check(weather.includes('id="weatherForecast"') &&
    weatherScript.includes('request("forecast.json"') &&
    weatherScript.includes('url.searchParams.set("days","3")') &&
    weatherScript.includes("daily_chance_of_rain"),
    "weather page requests and renders a source-provided three-day outlook");
  check(/\.weather-forecast\s*\{[^}]*grid-template-columns:\s*repeat\(3/s.test(weatherCss) &&
    /@media\s*\(max-width:\s*650px\)[\s\S]*?\.weather-forecast\s*\{\s*grid-template-columns:\s*1fr;/s.test(weatherCss),
    "three-day forecast cards collapse to a single column on mobile");
  check(i18n.includes('"weather.forecastTitle": "3-day outlook"') &&
    i18n.includes('"weather.forecastTitle": "अगले 3 दिनों का मौसम"') &&
    weatherScript.includes('onLangChange(() =>'),
    "forecast labels and data refresh when the language changes");

  console.log(`\nResponsive layout checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Responsive layout checks could not complete:", error);
  process.exitCode = 1;
});
