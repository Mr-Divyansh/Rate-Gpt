/**
 * Rate-GPT — Manifest attribution text normalization.
 *
 * Strips stray HTML (e.g. <a> tags) from author/license fields written
 * directly from Wikimedia extmetadata, and rewrites the manifest.
 *
 * Run: node scripts/clean-attribution.js
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanHtml } from "./image-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = `${REPO_ROOT}/commodity-image-manifest.json`;

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
let changed = 0;
for (const entry of manifest.commodities) {
  for (const key of ["author", "license"]) {
    const value = entry[key];
    if (value && typeof value === "string" && /<[a-z]/.test(value)) {
      const cleaned = cleanHtml(value);
      if (cleaned !== value) {
        entry[key] = cleaned;
        changed += 1;
      }
    }
  }
}
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`Cleaned ${changed} attribution fields.`);
