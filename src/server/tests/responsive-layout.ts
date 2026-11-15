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

  const [home, prices, baseCss, pricesCss, homeCss, globalNav, mandiScript] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("mandi-prices.html", "utf8"),
    readFile("style/base.css", "utf8"),
    readFile("style/mandi-prices.css", "utf8"),
    readFile("style/style.css", "utf8"),
    readFile("script/global-nav.js", "utf8"),
    readFile("script/mandi-prices.js", "utf8"),
  ]);

  for (const [file, html] of [["index.html", home], ["mandi-prices.html", prices]] as const) {
    check(/<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?"/i.test(html),
      `${file}: responsive viewport metadata`);
    check(/<a class="skip-link" href="#main-content"/.test(html),
      `${file}: keyboard skip navigation`);
  }

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

  const priceTableColumns = (prices.match(/<th\\s+scope="col"/g) || []).length;
  check(priceTableColumns === 5 && /td\\.colSpan = 5;/.test(mandiScript),
    "empty, loading and error table messages span the exact five visible price columns");

  console.log(`\nResponsive layout checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Responsive layout checks could not complete:", error);
  process.exitCode = 1;
});
