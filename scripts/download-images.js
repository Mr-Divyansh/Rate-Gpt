/**
 * Refresh local commodity photos from Wikimedia Commons.
 *
 * Only exact subject matches with reusable licenses are eligible. Run with
 * --dry-run to review selected files before replacing the local library.
 */

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMODITY_IMAGE_MAP } from "./commodity-image-map.js";
import { cleanHtml } from "./image-utils.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageRoot = path.join(root, "Images", "Vegetables");
const manifestPaths = [
  path.join(root, "commodity-image-manifest.json"),
  path.join(root, "public", "commodity-image-manifest.json"),
];
const userAgent =
  "RateGPT/1.0 (https://rate-gpt.vercel.app; local commodity image library; contact: webmaster@rate-gpt.vercel.app)";
const delayMs = 300;
const workerCount = 3;
const maxWidth = 700;
const webpQuality = 82;
const genericWords = new Set([
  "a", "an", "and", "as", "fresh", "fruit", "fruits", "grain", "grains/'",
  "green", "raw", "red", "root", "seed", "seeds", "spice", "spices",
  "vegetable", "vegetables", "white", "yellow", "orange", "brown",
]);
const excludedTitleTerms = [
  "art", "axe", "baked", "book", "butter", "cake", "carved", "chart", "chicken", "cider", "computer",
  "congee", "cooked", "cooking", "curry", "dessert", "diagram", "dish",
  "drawing", "farm", "field", "fried", "fudge", "building",
  "flower", "food", "herbarium", "icon", "illustration", "juice", "label", "logo",
  "idli", "market", "meal", "menu", "muri", "painting", "package", "packaging",
  "packet", "pie", "plant", "plantation", "poster", "porridge", "processed", "recipe", "restaurant",
  "roasted", "salad", "sauce", "seller", "shop", "sabji", "sabzi", "slice",
  "sliced", "cross section", "pitted", "sprout", "sprouting", "blossom", "soup",
  "stamp", "stew", "tree", "palm", "post office", "cell", "cells", "microscopy", "microscopic",
  "micrograph", "people", "person", "crowd", "stand", "workers", "weapon", "nematode", "sem",
  "fish", "grinding", "ingredients", "festival", "flowers", "tarkari", "museum",
  "svg", "pdf", "scan", "document",
];
const subjectAliases = {
  "ash-gourd": ["winter melon", "wax gourd", "benincasa hispida"],
  "bamboo-shoot": ["bamboo shoot", "bamboo shoots"],
  "bottle-gourd": ["bottle gourd", "calabash", "lauki"],
  "baby-corn": ["baby corn", "baby sweet corn", "babycorn", "young corn"],
  cauliflower: ["cauliflower head", "brassica oleracea botrytis", "cauliflower florets"],
  brinjal: ["eggplant", "aubergine"],
  capsicum: ["bell pepper", "sweet pepper", "green pepper", "capsicum"],
  "chikoo": ["sapodilla", "sapota", "chikoo"],
  chana: ["chickpea", "chickpeas", "bengal gram", "garbanzo bean", "garbanzo beans"],
  colocasia: ["colocasia", "taro root", "arbi"],
  "cluster-beans": ["cluster bean", "cluster beans", "guar"],
  "custard-apple": ["custard apple", "sugar apple", "annona squamosa"],
  "curry-leaf": ["curry leaves", "curry leaf", "murraya koenigii"],
  "dragon-fruit": ["dragon fruit", "pitaya"],
  "elephant-yam": ["elephant yam", "elephant yams", "elephant foot yam", "amorphophallus paeoniifolius"],
  "field-bean": ["field bean", "hyacinth bean", "lablab"],
  "green-chilli": ["green chilli", "green chili", "chili pepper", "chilli pepper"],
  "green-peas": ["green peas", "garden peas", "matar"],
  "knol-khol": ["kohlrabi", "knol khol"],
  "little-gourd": ["ivy gourd", "tindora", "coccinia grandis"],
  "maize": ["maize", "corn"],
  "bajra": ["pearl millet", "bajra", "pennisetum glaucum", "cenchrus americanus"],
  "browntop-millet": ["browntop millet", "urochloa ramosa"],
  "kulthi": ["horse gram", "horsegram", "macrotyloma uniflorum"],
  "masur-dal": ["red lentil", "red lentils", "masoor dal"],
  "moong-dal": ["moong dal", "mung dal", "yellow mung bean"],
  "chana-dal": ["chana dal", "split chickpea", "split chickpeas", "split bengal gram"],
  "arhar-dal": ["arhar dal", "toor dal", "split pigeon pea"],
  "dry-chilli": ["dried chili", "dried chilli", "dried red pepper"],
  asafoetida: ["asafoetida", "hing", "ferula asafoetida"],
  "coriander-seed": ["coriander seed", "coriander seeds", "dhania seed", "cilantro seed"],
  mace: ["mace spice", "mace aril", "nutmeg aril", "javitri"],
  "tapioca": ["cassava root", "manioc root", "yuca root"],
  "mousambi": ["sweet lime", "mosambi", "citrus limetta"],
  "pointed-gourd": ["pointed gourd", "parwal", "parval"],
  radish: ["white radish", "daikon", "mooli"],
  "ridge-gourd": ["ridge gourd", "luffa acutangula"],
  "sponge-gourd": ["sponge gourd", "luffa aegyptiaca"],
  "sweet-corn": ["sweet corn", "sweetcorn", "sugar corn", "corn on the cob"],
  "sweet-potato": ["sweet potato", "camote", "kumara"],
  "sweet-pumpkin": ["sweet pumpkin", "winter squash"],
  soyabean: ["soybean", "soyabean"],
  soybean: ["soybean", "soyabean"],
  arhar: ["pigeon pea", "arhar", "cajanus cajan"],
  tur: ["pigeon pea", "tur", "cajanus cajan"],
  almond: ["almond nuts", "almond kernels"],
  "kidney-beans": ["kidney beans", "red kidney beans", "rajma"],
  "wood-apple": ["wood apple", "bael", "aegle marmelos"],
};
const searchOverrides = {
  onion: ["onion bulb photo", "onion bulbs", "onion vegetable"],
  okra: ["okra pods", "fresh okra pods", "okra vegetable"],
  potato: ["potato tuber", "potato vegetable"],
  carrot: ["whole carrot fresh", "fresh carrot roots", "carrot vegetable"],
  radish: ["white radish", "daikon radish", "mooli white radish"],
  "green-peas": ["raw green peas", "fresh green peas", "green pea pods"],
  "green-chilli": ["fresh green chilli", "green chilli pepper"],
  "curry-leaf": ["murraya koenigii leaves", "curry leaves"],
  "sweet-potato": ["sweet potato tuber", "sweet potato root"],
  "kidney-beans": ["kidney beans seeds", "red kidney beans"],
  mousambi: ["sweet lime fruit", "mosambi fruit"],
  cauliflower: ["cauliflower head fresh", "whole cauliflower vegetable"],
  "baby-corn": ["baby corn cobs fresh", "baby corn vegetable"],
  "sweet-corn": ["sweet corn cob fresh", "corn on the cob sweet corn"],
  "elephant-yam": ["elephant yams", "elephant foot yam tubers", "amorphophallus paeoniifolius tuber"],
  "bajra": ["pearl millet grains bajra", "bajra grain seeds"],
  "browntop-millet": ["browntop millet grains", "urochloa ramosa seed"],
  kulthi: ["horse gram seeds", "macrotyloma uniflorum seeds"],
  "masur-dal": ["red lentil seeds", "masoor dal lentils"],
  "moong-dal": ["yellow moong dal split", "mung dal split beans"],
  "chana-dal": ["split chickpeas", "raw split chana dal seeds", "chana dal uncooked bengal gram"],
  "arhar-dal": ["toor dal lentils", "split pigeon peas"],
  "dry-chilli": ["dried red chili pods", "dried red chilli peppers"],
  asafoetida: ["hing spice resin", "asafoetida resin spice"],
  "coriander-seed": ["coriander seeds dhania", "dhania seeds spice"],
  mace: ["mace spice aril nutmeg", "javitri spice nutmeg"],
  tapioca: ["cassava root tuber raw", "yuca manioc root"],
  chana: ["chickpea seeds", "chickpeas dry grains", "bengal gram seeds"],
  almond: ["almond kernels", "almond nuts close up"],
  amla: ["amla fruit whole", "indian gooseberry fruit"],
  banana: ["banana fruit on white", "whole bananas fruit"],
  beetroot: ["beetroot roots fresh", "whole beetroot vegetable"],
  cashew: ["cashew nuts kernels", "cashew nuts close up"],
  chikoo: ["sapodilla fruit whole", "chikoo fruit close up"],
  "custard-apple": ["custard apple fruit whole", "sitaphal fruit"],
  date: ["dates fruit pile", "dried dates fruit"],
  drumstick: ["moringa pods drumstick vegetable", "fresh moringa pods"],
  "field-bean": ["hyacinth bean pods", "field bean pods"],
  jackfruit: ["jackfruit whole fruit", "jackfruit cut open fruit"],
  mace: ["mace spice nutmeg aril", "mace spice"],
  maize: ["maize grain kernels", "corn grain kernels"],
  masur: ["masoor lentils grains", "red lentil seeds"],
  peas: ["green peas seeds", "fresh peas in pods"],
  "pointed-gourd": ["pointed gourd whole", "fresh parwal vegetable"],
  rice: ["rice grains white rice", "uncooked rice grains"],
  soybean: ["soybean seeds grains", "soybean beans close up"],
  soyabean: ["soyabean seeds grains", "soybean beans close up"],
  tamarind: ["tamarind pods fruit", "tamarind fruit pods"],
  tapioca: ["cassava root whole fresh", "tapioca cassava root"],
};
const excludedByCommodity = {
  almond: ["wild", "tree", "leaf", "leaves", "indian almond"],
  amla: ["tree", "plantation", "indian gooseberry amla"],
  "apricot": ["compote"],
  arecanut: ["packet", "packaging"],
  banana: ["bottle", "packaging", "package", "aloha", "container", "plastic"],
  "bamboo-shoot": ["dried"],
  beetroot: ["jm27944", "jm27942", "label", "diagram", "infographic"],
  "bajra": ["house", "building", "temple"],
  "cauliflower": ["roasted", "fried", "baked", "sabzi", "peasant", "women", "carrying"],
  cashew: ["cheese", "fudge", "tree", "unripened", "leaves"],
  "celery": ["wild"],
  chana: ["fry", "fried", "muri", "fire", "department", "illinois", "post office", "sign"],
  chikoo: ["drawing", "illustration", "psm", "leaf", "leaves", "tree"],
  cinnamon: ["people", "workers", "market", "preparation"],
  "colocasia": ["leaf", "leaves", "plant"],
  "cowpea": ["blossom", "blossoms"],
  "dry-chilli": ["chicken", "recipe", "dish"],
  "arhar-dal": ["pakoda", "pakora", "fried", "curry", "dish"],
  "chana-dal": ["chana dal split bengal gram", "chapati", "roti", "pakoda", "pakora", "fried", "snack", "cooked", "dish", "chaat", "masala", "rice", "pilaf", "vada"],
  "dill-seed": ["packet", "nursery"],
  "elephant-yam": ["field", "plant", "germagnat", "nivigne", "mairie", "expo", "club", "warnes", "seoul", "stage", "suran", "thoran", "dalna", "khata", "elephant foot yam 1", "elephant foot yam 2"],
  "field-bean": ["blossom", "blossoms", "flower", "leaf", "leaves", "saatpilot", "view 2"],
  garlic: ["blanched", "spring garlic", "steaming"],
  "green-chilli": ["dried", "red chili", "red chilli", "red"],
  "green-peas": ["fried", "roasted"],
  groundnut: ["leaf", "leaves", "plant"],
  "jackfruit": ["film", "seller", "market", "crowd", "people", "vendor"],
  "kidney-beans": ["soup", "stew", "cooked"],
  "kodo-millet": ["idli"],
  "knol-khol": ["mischkultur", "radies", "leaf", "leaves", "young", "planted", "bestand"],
  "kiwi": ["ultraviolet", "fluorescence"],
  "little-gourd": ["sapling", "seedling"],
  mace: ["flail", "sabre", "sword", "weapon", "axe", "museum", "archaeology", "sb 2745", "horseback", "persia", "carrying", "vauban", "ilot"],
  "masur": ["richard", "sandra", "actor", "portrait", "headshot", "rgq"],
  "masur-dal": ["palak", "soup", "cooked", "dish", "curry"],
  "millets": ["grinding", "stone"],
  "peach": ["meat", "licorice"],
  "poppy-seed": ["cake", "cakes"],
  pumpkin: ["festival", "leaf", "leaves", "jack o lantern", "carved", "seed", "seeds"],
  "ragi": ["packet", "packaged"],
  "soyabean": ["sabji", "chunks", "gourd", "psf", "diagram", "plant", "field", "leaves", "oil", "bread"],
  "soybean": ["psf", "diagram", "plant", "field", "leaves", "oil", "bread"],
  "star-fruit": ["plate"],
  tapioca: ["process", "making", "fish", "river", "chips", "dadinhos", "porcao", "tapioca 02"],
  "pointed-gourd": ["plate", "dish", "cooked", "curry", "parwal"],
  "maize": ["jolly", "package", "packaging"],
  date: ["palm", "tree", "dates on"],
  "custard-apple": ["tree", "leaf", "leaves", "foliage", "kz03"],
  "drumstick": ["field", "leaves", "plantation"],
  "tamarind": ["tree", "leaves", "plantation"],
  "rice": ["paddy field", "rice field", "plant", "field", "crop"],
  "peas": ["plant", "field", "growing", "leaves"],
  "sweet-pumpkin": ["plate", "dish", "cooked", "table", "trombocino"],
  "tur": ["church", "kosciol", "kościół"],
  walnut: ["tree", "leaf", "leaves", "leave"],
  watermelon: ["seller", "selling"],
  yam: ["powder", "powdered", "tom yam", "saabji"],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsPhrase(text, phrase) {
  return ` ${text} `.includes(` ${normalizeTitle(phrase)} `);
}

function reusableLicense(license) {
  const value = String(license || "").trim();
  return (
    /^(public domain|cc0\b|cc by(?:-sa)?\s*[1-4](?:\.\d)?\b|gnu free documentation license|gfdl\b)/i.test(value) ||
    /^public domain\b/i.test(value)
  );
}

function metaValue(metadata, key) {
  const entry = metadata?.[key];
  return entry && typeof entry.value === "string" ? cleanHtml(entry.value) : null;
}

function phrasesFor(entry) {
  const idPhrase = entry.id.replace(/-/g, " ");
  const namePhrase = String(entry.name || "").replace(/\s*\([^)]*\)/g, "");
  const queryTerms = String(entry.query || "")
    .split(/[^a-z0-9]+/i)
    .filter((term) => term && !genericWords.has(term.toLowerCase()));
  return [
    idPhrase,
    namePhrase,
    queryTerms.join(" "),
    ...(subjectAliases[entry.id] || []),
  ]
    .map(normalizeTitle)
    .filter((phrase, index, list) => phrase && list.indexOf(phrase) === index);
}

function scoreCandidate(title, entry) {
  const normalized = normalizeTitle(title);
  if (excludedTitleTerms.some((term) => containsPhrase(normalized, term))) return -1;
  if ((excludedByCommodity[entry.id] || []).some((term) => containsPhrase(normalized, term))) return -1;
  if (
    (entry.id === "mace" && !["spice", "nutmeg", "aril"].some((term) => containsPhrase(normalized, term))) ||
    (entry.id === "custard-apple" && !containsPhrase(normalized, "fruit")) ||
    (entry.id === "tapioca" && !["cassava root", "tapioca root", "manioc root"].some((term) => containsPhrase(normalized, term))) ||
    (entry.id === "chana-dal" && !["raw", "uncooked", "split", "seed", "seeds", "grain", "grains"].some((term) => containsPhrase(normalized, term)))
  ) return -1;
  if (
    (entry.id === "potato" && containsPhrase(normalized, "sweet potato")) ||
    (entry.id === "carrot" && ["misshapen", "deformed", "damaged", "plate"].some((term) => containsPhrase(normalized, term))) ||
    (entry.id === "onion" && ["spring onion", "allium lacunosum"].some((term) => containsPhrase(normalized, term))) ||
    (entry.id === "okra" && ["with coriander", "with corriander", "okra plant", "okra seeds", "dried okra"].some((term) => containsPhrase(normalized, term))) ||
    (entry.id === "radish" && ["red radish", "watermelon radish"].some((term) => containsPhrase(normalized, term)))
  ) return -1;
  const allowedPhrases = new Set(phrasesFor(entry));
  const otherCommodity = COMMODITY_IMAGE_MAP
    .filter((commodity) => commodity.id !== entry.id)
    .flatMap((commodity) => [
      commodity.id.replace(/-/g, " "),
      String(commodity.name || "").replace(/\s*\([^)]*\)/g, ""),
      ...(subjectAliases[commodity.id] || []),
    ])
    .map(normalizeTitle)
    .filter((phrase) =>
      phrase.length > 3 &&
      ![...allowedPhrases].some((allowed) => containsPhrase(allowed, phrase)),
    )
    .some((phrase) => {
      const plural = phrase.endsWith("s") ? `${phrase}es` : `${phrase}s`;
      return containsPhrase(normalized, phrase) || containsPhrase(normalized, plural);
    });
  if (otherCommodity) return -1;
  const matches = phrasesFor(entry).filter((phrase) => containsPhrase(normalized, phrase));
  if (!matches.length) return -1;
  const subjectScore = Math.max(...matches.map((phrase) => phrase.split(" ").length * 10 + phrase.length));
  const preferredTerms = ["fresh", "raw", "whole", "close up", "closeup", "on white", "daikon", "white radish"];
  return subjectScore + preferredTerms.filter((term) => containsPhrase(normalized, term)).length * 8;
}

function searchQueries(entry) {
  const name = String(entry.name || "").replace(/\s*\([^)]*\)/g, "");
  const queries = [
    ...(searchOverrides[entry.id] || []),
    entry.query,
    ...(subjectAliases[entry.id] || []),
    entry.id.replace(/-/g, " "),
    name,
  ];
  return queries.filter((query, index) => query && queries.indexOf(query) === index);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Wikimedia API returned HTTP ${response.status}`);
  return response.json();
}

async function searchImages(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: query,
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|size|extmetadata|mime",
    iiurlwidth: String(maxWidth),
    format: "json",
  });
  const data = await fetchJson(url);
  return Object.values(data.query?.pages || {})
    .map((page) => {
      const info = page.imageinfo?.[0];
      return info ? { ...info, title: page.title } : null;
    })
    .filter(Boolean);
}

function selectCandidate(infos, entry) {
  return infos
    .map((info) => {
      const license = metaValue(info.extmetadata, "LicenseShortName") ||
        metaValue(info.extmetadata, "UsageTerms");
      const author = metaValue(info.extmetadata, "Artist") ||
        metaValue(info.extmetadata, "Credit");
      return {
        info,
        license,
        author,
        score: scoreCandidate(info.title, entry),
      };
    })
    .filter(({ info, license, author, score }) =>
      score >= 0 &&
      ["image/jpeg", "image/png", "image/webp", "image/tiff"].includes(info.mime) &&
      info.thumburl &&
      reusableLicense(license) &&
      (!/^CC BY\b/i.test(license || "") || Boolean(author)),
    )
    .sort((a, b) => b.score - a.score || (b.info.size || 0) - (a.info.size || 0))[0] || null;
}

function convertToWebp(buffer) {
  return execFileSync(
    process.env.FFMPEG_PATH || "ffmpeg",
    [
      "-hide_banner",
      "-loglevel", "error",
      "-i", "pipe:0",
      "-vf", `scale=${maxWidth}:${maxWidth}:force_original_aspect_ratio=decrease`,
      "-frames:v", "1",
      "-c:v", "libwebp",
      "-quality", String(webpQuality),
      "-f", "webp",
      "pipe:1",
    ],
    { input: buffer, maxBuffer: 32 * 1024 * 1024, timeout: 60000 },
  );
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Image download returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function manifestEntry(entry, selected) {
  if (!selected) {
    return {
      id: entry.id,
      name: entry.name,
      hindi: entry.hindi || null,
      category: entry.category,
      image: `Vegetables/${entry.category}/${entry.id}.webp`,
      source: "Wikimedia Commons",
      sourceUrl: null,
      imageUrl: null,
      license: null,
      author: null,
      status: "missing",
    };
  }
  const { info, license } = selected;
  return {
    id: entry.id,
    name: entry.name,
    hindi: entry.hindi || null,
    category: entry.category,
    image: `Vegetables/${entry.category}/${entry.id}.webp`,
    source: "Wikimedia Commons",
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(info.title.replace(/ /g, "_"))}`,
    imageUrl: info.thumburl,
    license,
    author: selected.author,
    status: "available",
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const previewArg = process.argv.find((arg) => arg.startsWith("--preview-dir="));
  const previewDir = previewArg
    ? path.resolve(root, previewArg.slice("--preview-dir=".length))
    : null;
  const idsArgument = process.argv.find((arg) => arg.startsWith("--ids="));
  const selectedIds = idsArgument
    ? new Set(idsArgument.slice("--ids=".length).split(",").filter(Boolean))
    : null;
  const entries = COMMODITY_IMAGE_MAP.filter((entry) => !selectedIds || selectedIds.has(entry.id));
  if (selectedIds && entries.length !== selectedIds.size) {
    throw new Error("One or more requested commodity IDs do not exist in the image map.");
  }

  const priorManifest = JSON.parse(await readFile(manifestPaths[0], "utf8"));
  const priorEntries = new Map(priorManifest.commodities.map((item) => [item.id, item]));
  const updatedEntries = new Map();
  let downloaded = 0;
  let matched = 0;
  let missing = 0;
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < entries.length) {
      const entry = entries[nextIndex];
      nextIndex += 1;
      let selected = null;
      for (const query of searchQueries(entry)) {
        const infos = await searchImages(query);
        selected = selectCandidate(infos, entry);
        if (selected) break;
      }
      const result = manifestEntry(entry, selected);

      if (selected) {
        matched += 1;
        const title = selected.info.title;
        console.log(`[selected] ${entry.id}: ${title} (${selected.license}; score ${selected.score})`);
        if (!dryRun || previewDir) {
          const buffer = await downloadImage(selected.info.thumburl);
          const webp = convertToWebp(buffer);
          const destination = dryRun
            ? path.join(previewDir, `${entry.id}.webp`)
            : path.join(imageRoot, entry.category, `${entry.id}.webp`);
          await mkdir(path.dirname(destination), { recursive: true });
          await writeFile(destination, webp);
          console.log(`[${dryRun ? "preview" : "saved"}] ${entry.id}: ${webp.length} bytes`);
          if (!dryRun) downloaded += 1;
        }
      } else {
        missing += 1;
        const prior = priorEntries.get(entry.id);
        if (dryRun && prior?.status === "available") {
          updatedEntries.set(entry.id, prior);
          console.warn(`[no licensed exact match] ${entry.id}; keeping existing file for review`);
          await sleep(delayMs);
          continue;
        }
        console.warn(`[no licensed exact match] ${entry.id}`);
      }

      updatedEntries.set(entry.id, result);
      await sleep(delayMs);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(workerCount, entries.length) }, () => worker()),
  );

  if (dryRun) {
    console.log(`\nDry run complete: reviewed=${entries.length} candidates=${matched} no-match=${missing}`);
    return;
  }

  const commodityEntries = priorManifest.commodities
    .map((item) => updatedEntries.get(item.id) || item);
  const refreshed = {
    ...priorManifest,
    generatedAt: new Date().toISOString(),
    note: "Wikimedia Commons images use the per-entry reusable license. See sourceUrl, imageUrl, license, and author for attribution.",
    commodities: commodityEntries.sort((a, b) => a.id.localeCompare(b.id)),
  };
  const serialized = JSON.stringify(refreshed, null, 2);
  for (const manifestPath of manifestPaths) {
    await writeFile(manifestPath, serialized);
  }
  console.log(`\nRefresh complete: total=${commodityEntries.length} downloaded=${downloaded} missing=${missing}`);
}

main().catch((error) => {
  console.error("FATAL", error);
  process.exitCode = 1;
});
