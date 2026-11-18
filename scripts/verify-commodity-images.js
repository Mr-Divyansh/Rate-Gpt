import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { commodityImageUrl, resolveId } from "./commodity-image-map.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "commodity-image-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = baseUrlArg?.slice("--base-url=".length).replace(/\/+$/, "");

const requiredAliases = new Map([
  ["Potato", "potato"], ["Aloo", "potato"], ["Aaloo", "potato"], ["Alu", "potato"], ["आलू", "potato"],
  ["Tomato", "tomato"], ["Tamatar", "tomato"], ["टमाटर", "tomato"],
  ["Onion", "onion"], ["Pyaz", "onion"], ["प्याज", "onion"],
  ["Brinjal", "brinjal"], ["Baingan", "brinjal"], ["बैंगन", "brinjal"],
  ["Cucumber", "cucumber"], ["Kheera", "cucumber"], ["खीरा", "cucumber"],
  ["Ridgeguard (Tori)", "ridge-gourd"], ["Thondekai", "little-gourd"],
  ["Bottle Gourd", "bottle-gourd"], ["Lauki", "bottle-gourd"], ["लौकी", "bottle-gourd"],
  ["Bhindi", "okra"], ["Okra", "okra"], ["भिंडी", "okra"],
  ["Capsicum", "capsicum"], ["Shimla Mirch", "capsicum"], ["शिमला मिर्च", "capsicum"],
  ["Apple", "apple"], ["सेब", "apple"],
  ["Seetapal", "custard-apple"],
  ["Carrot", "carrot"], ["गाजर", "carrot"],
  ["Colacasia", "colocasia"],
  ["Radish", "radish"], ["मूली", "radish"],
  ["Mousambi", "mousambi"], ["Mosambi", "mousambi"], ["Sweet Lime", "mousambi"], ["मौसमी", "mousambi"],
  ["Karbuja", "muskmelon"],
]);

const report = {
  total: manifest.commodities.length,
  available: 0,
  unavailable: 0,
  verified: 0,
  validFiles: 0,
  missing: 0,
  brokenPaths: 0,
  incorrectMappings: 0,
  invalidFormats: 0,
  httpFailures: 0,
  incompleteAttribution: 0,
  issues: [],
};

for (const item of manifest.commodities) {
  const imagePath = String(item.image || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const expectedPath = `Vegetables/${item.category}/${item.id}.webp`;
  const filePath = path.resolve(root, "Images", ...imagePath.split("/"));
  const expectedFilePath = path.resolve(root, "Images", ...expectedPath.split("/"));
  let validFile = true;
  let validMetadata = true;
  let fileRead = false;

  if (imagePath !== expectedPath || filePath !== expectedFilePath) {
    report.brokenPaths += 1;
    report.issues.push(`${item.id}: manifest path "${item.image}" should be "${expectedPath}"`);
    validFile = false;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile() || fileInfo.size === 0) {
      report.missing += 1;
      report.issues.push(`${item.id}: image file is empty or not a file (${filePath})`);
      validFile = false;
    } else {
      const header = await readFile(filePath, { encoding: null, flag: "r" });
      fileRead = true;
      if (
        path.extname(filePath).toLowerCase() !== ".webp" ||
        header.toString("ascii", 0, 4) !== "RIFF" ||
        header.toString("ascii", 8, 12) !== "WEBP"
      ) {
        report.invalidFormats += 1;
        report.issues.push(`${item.id}: invalid WebP file (${filePath})`);
        validFile = false;
      } else {
        execFileSync(
          process.env.FFMPEG_PATH || "ffmpeg",
          ["-v", "error", "-i", filePath, "-frames:v", "1", "-f", "null", "-"],
          { stdio: "ignore", timeout: 30000 },
        );
      }
    }
  } catch {
    if (!fileRead) {
      report.missing += 1;
      report.issues.push(`${item.id}: missing image file (${filePath})`);
      validFile = false;
    } else if (validFile) {
      report.invalidFormats += 1;
      report.issues.push(`${item.id}: image file cannot be decoded (${filePath})`);
      validFile = false;
    }
  }

  if (item.status === "available") {
    report.available += 1;
    if (
      !item.sourceUrl ||
      !item.license ||
      (/^CC BY(?:-SA)?\b/i.test(item.license) && !item.author)
    ) {
      report.incompleteAttribution += 1;
      report.issues.push(`${item.id}: available photo is missing required attribution metadata`);
      validMetadata = false;
    }
  } else if (item.status === "missing") {
    report.unavailable += 1;
  } else {
    report.incorrectMappings += 1;
    report.issues.push(`${item.id}: unsupported manifest status "${item.status}"`);
    validMetadata = false;
  }

  if (resolveId(item.id) !== item.id) {
    report.incorrectMappings += 1;
    report.issues.push(`${item.id}: manifest commodity does not resolve to its own image`);
    validMetadata = false;
  }

  if (baseUrl) {
    const imageUrl = commodityImageUrl(manifest.imageBase, item.image);
    try {
      if (!imageUrl) throw new Error("Unable to create the public image URL");
      const response = await fetch(new URL(imageUrl, `${baseUrl}/`));
      const body = Buffer.from(await response.arrayBuffer());
      const isWebp = body.toString("ascii", 0, 4) === "RIFF" &&
        body.toString("ascii", 8, 12) === "WEBP";
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("image/webp") || !isWebp) {
        report.httpFailures += 1;
        report.issues.push(
          `${item.id}: ${imageUrl} returned HTTP ${response.status} ` +
          `(${response.headers.get("content-type") || "no content type"})`,
        );
        validFile = false;
      }
    } catch (error) {
      report.httpFailures += 1;
      report.issues.push(`${item.id}: ${imageUrl || item.image} request failed (${error.message})`);
      validFile = false;
    }
  }

  if (validFile) report.validFiles += 1;
  if (item.status === "available" && validFile && validMetadata) {
    report.verified += 1;
  }
}

for (const [alias, expectedId] of requiredAliases) {
  const actualId = resolveId(alias);
  if (actualId !== expectedId) {
    report.incorrectMappings += 1;
    report.issues.push(`alias "${alias}" resolves to ${actualId || "no image"}, expected ${expectedId}`);
  }
}

console.log(`Total images: ${report.total}`);
console.log(`Available images: ${report.available}`);
console.log(`Unavailable images: ${report.unavailable}`);
console.log(`Valid local files: ${report.validFiles}`);
console.log(`Verified available images: ${report.verified}`);
console.log(`Missing local files: ${report.missing}`);
console.log(`Broken paths: ${report.brokenPaths}`);
console.log(`Incorrect mappings: ${report.incorrectMappings}`);
console.log(`Invalid formats: ${report.invalidFormats}`);
console.log(`Incomplete attribution: ${report.incompleteAttribution}`);
if (baseUrl) console.log(`Public URL failures: ${report.httpFailures}`);
for (const issue of report.issues) console.error(`- ${issue}`);

if (
  report.available !== report.total ||
  report.verified !== report.total ||
  report.unavailable ||
  report.issues.length
) process.exitCode = 1;
