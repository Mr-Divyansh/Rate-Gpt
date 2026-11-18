/**
 * Prepare local commodity photographs for Vite's public asset pipeline.
 * Source images stay in /Images; a clean copy is placed in /public/Images
 * before dev/build so Vite serves them from /Images/... in every environment.
 */
import { cpSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceImages = resolve(root, "Images");
const publicDir = resolve(root, "public");
const publicImages = resolve(publicDir, "Images");
const sourceManifest = resolve(root, "commodity-image-manifest.json");
const publicManifest = resolve(publicDir, "commodity-image-manifest.json");

if (!existsSync(sourceImages)) {
  throw new Error("Commodity image source directory is missing: " + sourceImages);
}
mkdirSync(publicDir, { recursive: true });
cpSync(sourceImages, publicImages, { recursive: true, force: true });
if (existsSync(sourceManifest)) {
  copyFileSync(sourceManifest, publicManifest);
}
console.log("[Rate-GPT] Prepared public commodity images and manifest.");
