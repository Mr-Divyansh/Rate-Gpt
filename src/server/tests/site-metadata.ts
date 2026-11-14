import { readFile } from "node:fs/promises";

const pages = [
  ["index.html", "https://rate-gpt.vercel.app/"],
  ["mandi-prices.html", "https://rate-gpt.vercel.app/mandi-prices.html"],
  ["about.html", "https://rate-gpt.vercel.app/about.html"],
  ["contact.html", "https://rate-gpt.vercel.app/contact.html"],
  ["privacy.html", "https://rate-gpt.vercel.app/privacy.html"],
  ["terms.html", "https://rate-gpt.vercel.app/terms.html"],
] as const;

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
  console.log("\nRate-GPT public-site metadata checks");

  for (const [file, canonical] of pages) {
    const html = await readFile(file, "utf8");
    const escapedCanonical = canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    check(/<html\b[^>]*\blang="(?:en|hi)"/i.test(html), `${file}: document language`);
    check(/<title(?:\s[^>]*)?>[^<]+<\/title>/i.test(html), `${file}: title element`);
    check(/<meta\s+name="description"\s+content="[^"]{30,}"/i.test(html), `${file}: descriptive meta description`);
    check(new RegExp(`<link\\s+rel="canonical"\\s+href="${escapedCanonical}"`).test(html), `${file}: canonical URL`);
    for (const property of ["og:title", "og:description", "og:url", "og:image", "og:site_name"]) {
      check(new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]+"`).test(html), `${file}: ${property}`);
    }
    check(/<meta\s+name="twitter:card"\s+content="summary_large_image"/.test(html), `${file}: Twitter card`);
    check(/<meta\s+name="twitter:image"\s+content="https:\/\//.test(html), `${file}: absolute Twitter image URL`);
  }

  const sitemap = await readFile("sitemap.xml", "utf8");
  const robots = await readFile("robots.txt", "utf8");
  for (const [, canonical] of pages) {
    check(sitemap.includes(`<loc>${canonical}</loc>`), `sitemap includes ${canonical}`);
  }
  check(robots.includes("Sitemap: https://rate-gpt.vercel.app/sitemap.xml"), "robots.txt references the public sitemap");

  const home = await readFile("index.html", "utf8");
  const jsonLd = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let schemaValid = false;
  if (jsonLd) {
    try {
      const schema = JSON.parse(jsonLd[1]);
      schemaValid = schema["@context"] === "https://schema.org" &&
        schema["@type"] === "WebSite" &&
        schema.url === "https://rate-gpt.vercel.app/";
    } catch {
      schemaValid = false;
    }
  }
  check(schemaValid, "homepage WebSite JSON-LD parses and contains verified identity fields");

  console.log(`\nSite metadata checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Site metadata checks could not complete:", error);
  process.exitCode = 1;
});
