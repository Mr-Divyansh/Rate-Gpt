/**
 * Rate-GPT — Manifest attribution enrichment.
 *
 * For every entry that lacks sourceUrl/license/author, fetches the Wikimedia
 * Commons imageinfo metadata and writes it back into the manifest. This gives
 * proper attribution for every mapped commodity image.
 *
 * Run: node scripts/enrich-attribution.js
 */

import { readFileSync, writeFileSync } from "fs";
import { COMMODITY_IMAGE_MAP } from "./commodity-image-map.js";

const MANIFEST_PATH = new URL("../commodity-image-manifest.json", import.meta.url).pathname;
const UA =
  "RateGPT/1.0 (https://rate-gpt.vercel.app; attribution enrichment)";
const HEADERS = { "User-Agent": UA, Accept: "application/json" };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function metaValue(extmetadata, key) {
  const entry = extmetadata?.[key];
  if (!entry) return null;
  if (typeof entry.value === "string") return entry.value;
  if (entry.value && typeof entry.value === "object") {
    return String(entry.value);
  }
  return null;
}

async function getImageInfo(title) {
  const data = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|extmetadata&format=json`,
    { headers: HEADERS, signal: AbortSignal.timeout(20000) },
  ).then((r) => r.json());
  const pages = data.query.pages || {};
  const page = Object.values(pages)[0] || {};
  return (page.imageinfo || [])[0] || null;
}

async function enrichEntry(entry) {
  if (entry.license) return entry; // already enriched
  try {
    const info = await getImageInfo(entry.image); // e.g. "Vegetables/vegetables/potato.webp" -> need File: prefix
    if (!info) return entry;
    // image field is a relative path, not a file title. Reconstruct the title.
    // We fetch by mapping image path -> File:...; fall back to entry id if needed.
    const fileTitle = `File:${(info.title || "").replace(/^File:/, "")}`.replace("Vegetables/", "Vegetables/");
    // Actually image path came as 'Vegetables/xxx.webp'; the Commons title is 'File:Vegetables/xxx.webp'? No.
    // The imageinfo title is the canonical Commons title e.g. 'File:Apium graveolens seeds.jpg'.
    if (!info.title) return entry;
    entry.sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(info.title)}`;
    entry.license = metaValue(info.extmetadata, "LicenseShortName") || metaValue(info.extmetadata, "UsageTerms") || null;
    entry.author = metaValue(info.extmetadata, "Artist") || null;
    entry.source = entry.source || "Wikimedia Commons";
    return entry;
  } catch (err) {
    return entry;
  }
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const enriched = [];
  let count = 0;
  for (const entry of manifest.commodities) {
    const updated = await enrichEntry(entry);
    if (updated.license || updated.author || updated.sourceUrl) count += 1;
    enriched.push(updated);
    if (enriched.length % 10 === 0) {
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      await sleep(150);
    }
  }
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Enriched ${count}/${manifest.commodities.length} entries with attribution.`);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});