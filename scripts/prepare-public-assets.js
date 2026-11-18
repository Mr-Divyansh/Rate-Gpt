/**
 * Prepare local commodity photographs for Vite's public asset pipeline.
 * Source images stay in /Images; a clean copy is placed in /public/Images
 * before dev/build so Vite serves them from /Images/... in every environment.
 */
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveId } from "./commodity-image-map.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceImages = resolve(root, "Images");
const publicDir = resolve(root, "public");
const publicImages = resolve(publicDir, "Images");
const sourceManifest = resolve(root, "commodity-image-manifest.json");
const publicManifest = resolve(publicDir, "commodity-image-manifest.json");

if (!existsSync(sourceImages)) {
  throw new Error("Commodity image source directory is missing: " + sourceImages);
}
const manifest = JSON.parse(readFileSync(sourceManifest, "utf8"));
const unavailable = (manifest.commodities || []).filter((item) =>
  item.status !== "available" || !item.image || !existsSync(resolve(sourceImages, item.image))
);
if (unavailable.length) {
  throw new Error("Commodity image verification failed: " + unavailable.map((item) => item.id).join(", "));
}
for (const [label, expected] of [["Aloo", "potato"], ["Baingan", "brinjal"], ["Kheera", "cucumber"]]) {
  if (resolveId(label) !== expected) {
    throw new Error("Commodity alias verification failed for " + label);
  }
}
mkdirSync(publicDir, { recursive: true });
cpSync(sourceImages, publicImages, { recursive: true, force: true });
if (existsSync(sourceManifest)) {
  copyFileSync(sourceManifest, publicManifest);
}
console.log("[Rate-GPT] Verified " + manifest.commodities.length + " commodity photos and prepared public assets.");
