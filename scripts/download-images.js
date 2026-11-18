/**
 * Rate-GPT — Local commodity image downloader.
 *
 * Fetches a relevant photograph for each mapped commodity from Wikimedia
 * Commons (free licenses), resizes/optimizes it to WebP, and writes a
 * manifest with source + attribution information.
 *
 * Run: node --input-type=module scripts/download-images.js
 *
 * Wikimedia Commons terms respected:
 *   - Descriptive User-Agent identifying the project.
 *   - Modest, sequential requests with a delay (courtesy throttle).
 *   - License/author recorded for every downloaded image.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { COMMODITY_IMAGE_MAP, CATEGORIES } from "./commodity-image-map.js";
import { cleanHtml } from "./image-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const IMAGES_DIR = `${REPO_ROOT}/Images/Vegetables`;
const MANIFEST_PUBLIC_PATH = `${REPO_ROOT}/commodity-image-manifest.json`;

const UA =
  "RateGPT/1.0 (https://rate-gpt.vercel.app; local commodity image library build; contact: webmaster@rate-gpt.vercel.app)";
const HEADERS = { "User-Agent": UA, Accept: "application/json" };
const DELAY_MS = 300;
const MAX_WIDTH = 700;
const WEBP_QUALITY = 82;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function searchFiles(query) {
  const data = await fetchJson(
    "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        srnamespace: 6,
        srlimit: 10,
        format: "json",
      }),
  );
  return (data.query.search || []).map((s) => s.title);
}

async function getImageInfo(title) {
  const data = await fetchJson(
    "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        titles: title,
        prop: "imageinfo",
        iiprop: "url|size|extmetadata",
        format: "json",
        iiurlwidth: String(MAX_WIDTH),
      }),
  );
  const pages = data.query.pages || {};
  const page = Object.values(pages)[0] || {};
  const info = (page.imageinfo || [])[0];
  return info;
}

function metaValue(extmetadata, key) {
  const entry = extmetadata?.[key];
  if (!entry) return null;
  if (typeof entry.value === "string") return cleanHtml(entry.value);
  if (entry.value && typeof entry.value === "object") {
    return cleanHtml(String(entry.value));
  }
  return null;
}

function titleKeywords(entry) {
  const words = new Set();
  const add = (text) => {
    String(text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2)
      .forEach((w) => words.add(w));
  };
  add(entry.id);
  add(entry.name);
  add(entry.query);
  return words;
}

// Score a Commons file title for relevance to the commodity. Positive signals:
// the title contains commodity keywords. Negative signals: cooked dishes,
// market scenes, stamps, PDFs, etc. (we want a clean product photograph).
function scoreCandidate(title, entry) {
  const kws = titleKeywords(entry);
  const low = title.toLowerCase();
  let score = 0;
  let matched = 0;
  for (const kw of kws) {
    if (low.includes(kw)) {
      matched += 1;
      score += 3;
    }
  }
  // Prefer exact-ish commodity presence; require at least one keyword for
  // non-generic queries, but still allow a generic fallback candidate.
  const negatives = [
    "curry", "dish", "cooked", "cooking", "recipe", "meal", "food",
    "market", "shop", "stall", "basket", "salad", "soup", "stamp",
    "coin", "banknote", "pdf", "djvu", "herbarium", "growing", "field",
    "plant", "farm", "harvest",
  ];
  for (const neg of negatives) {
    if (low.includes(neg)) score -= 2;
  }
  // Smaller, tighter files (single subject on white/neutral) score slightly higher.
  if (/\b(isolated|white background|cutout|studio)\b/.test(low)) score += 2;
  return { score, matched };
}

async function downloadBuffer(url) {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
async function main() {
  CATEGORIES.forEach((cat) => mkdirSync(`${IMAGES_DIR}/${cat}`, { recursive: true }));

  const manifest = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    imageBase: "/Images",
    fallbackImage: null,
    note:
      "Images sourced from Wikimedia Commons under free licenses. See per-entry source/license for attribution.",
    commodities: [],
  };

  let downloaded = 0;
  let skipped = 0;
  let missing = 0;

  for (const entry of COMMODITY_IMAGE_MAP) {
    const destDir = `${IMAGES_DIR}/${entry.category}`;
    const dest = `${destDir}/${entry.id}.webp`;
    const relPath = `Vegetables/${entry.category}/${entry.id}.webp`;

    const result = {
      id: entry.id,
      name: entry.name,
      hindi: entry.hindi || null,
      category: entry.category,
      image: relPath,
      source: entry.source,
      sourceUrl: null,
      imageUrl: null,
      license: null,
      author: null,
    };

    if (existsSync(dest)) {
      skipped += 1;
      result.status = "available";
      manifest.commodities.push(result);
      continue;
    }

    let fileInfo = null;
    let chosenTitle = null;
    let bestScore = -Infinity;
    try {
      const titles = await searchFiles(entry.query);
      const candidates = [];
      for (const title of titles) {
        try {
          const info = await getImageInfo(title);
          if (info && info.url) {
            candidates.push({ title, info, score: scoreCandidate(title, entry) });
          }
        } catch (err) {
          // try next candidate
        }
        await sleep(DELAY_MS);
      }
      // Pick the highest-scored candidate; require at least one keyword match
      // unless nothing matched at all.
      const withMatch = candidates.filter((c) => c.score.matched > 0);
      const pool = withMatch.length ? withMatch : candidates;
      pool.sort((a, b) => b.score.score - a.score.score);
      if (pool[0]) {
        fileInfo = pool[0].info;
        chosenTitle = pool[0].title;
        bestScore = pool[0].score.score;
      }
    } catch (err) {
      console.warn(`  [search fail] ${entry.id}: ${entry.query} -> ${err.message}`);
    }
    console.debug &&
      console.debug(`  [score] ${entry.id}: chosen="${chosenTitle}" score=${bestScore}`);

    if (!fileInfo) {
      missing += 1;
      result.status = "missing";
      console.warn(`  [missing] ${entry.id}: no Wikimedia image for "${entry.query}"`);
      manifest.commodities.push(result);
      await sleep(DELAY_MS);
      continue;
    }

    try {
      const imageUrl = fileInfo.thumburl || fileInfo.url;
      const buffer = await downloadBuffer(imageUrl);

      const ext = (chosenTitle || "").toLowerCase();
      if (!/\.(jpg|jpeg|png|webp|tif|tiff)$/.test(ext)) {
        missing += 1;
        result.status = "missing";
        console.warn(`  [non-image] ${entry.id}: skipped "${chosenTitle}" (not an image)`);
      } else {
        const buffer = await downloadBuffer(imageUrl);
        const hasAlpha = /\.(png|webp|tiff?)$/.test(ext);
        const sharp = (await import("sharp")).default;
        let instance = sharp(buffer).resize(MAX_WIDTH, MAX_WIDTH, {
          fit: "inside",
          withoutEnlargement: true,
        });
        if (hasAlpha) {
          instance = instance.webp({ quality: WEBP_QUALITY, lossless: false });
        } else {
          instance = instance.webp({ quality: WEBP_QUALITY });
        }
        await instance.toFile(dest);

        const em = fileInfo.extmetadata || {};
        result.sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(chosenTitle)}`;
        result.imageUrl = imageUrl;
        result.license = metaValue(em, "LicenseShortName") || metaValue(em, "UsageTerms") || null;
        result.author = metaValue(em, "Artist") || null;
        result.status = "available";
        downloaded += 1;
        console.log(`  [ok] ${entry.id} <- ${chosenTitle} (${result.license})`);
      }

      const em = fileInfo.extmetadata || {};
      result.sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(chosenTitle)}`;
      result.imageUrl = imageUrl;
      result.license =
        metaValue(em, "LicenseShortName") || metaValue(em, "UsageTerms") || null;
      result.author = metaValue(em, "Artist") || null;
      result.status = "available";
      downloaded += 1;
      console.log(`  [ok] ${entry.id} <- ${chosenTitle} (${result.license})`);
    } catch (err) {
      missing += 1;
      result.status = "missing";
      console.warn(`  [download fail] ${entry.id}: ${err.message}`);
    }

    manifest.commodities.push(result);
    await sleep(DELAY_MS);
  }

  manifest.commodities.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(MANIFEST_PUBLIC_PATH, JSON.stringify(manifest, null, 2));

  const total = manifest.commodities.length;
  const available = manifest.commodities.filter((c) => c.status === "available").length;
  console.log(`\nDone. total=${total} downloaded=${downloaded} skipped=${skipped} missing=${missing} available=${available}`);
  console.log(`Manifest: ${MANIFEST_PUBLIC_PATH}`);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});