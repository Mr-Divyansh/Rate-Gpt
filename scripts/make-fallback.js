import sharp from "sharp";
import { mkdirSync } from "fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const dir = `${REPO_ROOT}/Images/Vegetables/other`;
mkdirSync(dir, { recursive: true });

const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='700' height='500' viewBox='0 0 700 500'>
  <rect width='700' height='500' fill='#f5f5f0'/>
  <circle cx='350' cy='230' r='150' fill='#e8e8d8' stroke='#c9c9b0' stroke-width='4'/>
  <path d='M350 80 Q210 80 210 230 Q210 380 350 380 Q490 380 490 230 Q490 80 350 80' fill='none' stroke='#b7b794' stroke-width='6' stroke-linejoin='round'/>
  <path d='M270 160 Q350 120 430 160' fill='none' stroke='#8aa96b' stroke-width='5' stroke-linecap='round'/>
  <path d='M330 140 L350 100 L370 140' fill='#8aa96b'/>
  <rect x='300' y='360' width='100' height='24' rx='8' fill='#d8d8c0'/>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(`${dir}/fallback.png`);
await sharp(`${dir}/fallback.png`).webp({ quality: 80 }).toFile(`${dir}/fallback.webp`);
console.log("fallback.webp created");