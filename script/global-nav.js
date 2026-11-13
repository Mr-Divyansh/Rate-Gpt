import { applyI18n, getLang, setLang, onLangChange, t } from "./i18n.js";
import { hydrateIcons, icon } from "./icons.js";

const LOGO_URL = new URL("../Images/Logo.webp", import.meta.url).href;

const LINKS = [
  ["nav.home", "index.html"],
  ["nav.prices", "mandi-prices.html"],
  ["nav.about", "about.html"],
];

const currentPage =
  window.location.pathname.split("/").pop()?.toLowerCase() || "index.html";

function navLink([key, href]) {
  const a = document.createElement("a");
  a.href = href;
  a.dataset.i18n = key;
  if (href === currentPage) a.setAttribute("aria-current", "page");
  return a;
}

function brand(className) {
  const a = document.createElement("a");
  a.className = className;
  a.href = "index.html";
  a.setAttribute("aria-label", "Rate-GPT");
  const mark = document.createElement("span");
  mark.className = "brand-mark";
  const img = document.createElement("img");
  img.src = LOGO_URL;
  img.alt = "Rate-GPT logo";
  img.width = 70;
  img.height = 70;
  img.decoding = "async";
  mark.append(img);
  const text = document.createElement("span");
  text.className = "brand-text";
  const name = document.createElement("strong");
  name.textContent = "Rate-GPT";
  const tag = document.createElement("small");
  tag.dataset.i18n = "brand.tag";
  text.append(name, tag);
  a.append(mark, text);
  return a;
}

function languageToggle() {
  const group = document.createElement("div");
  group.className = "lang-toggle";
  group.setAttribute("role", "group");
  group.dataset.i18nAttr = "aria-label:lang.label";
  for (const [code, label, name] of [
    ["en", "EN", "English"],
    ["hi", "हिं", "हिन्दी"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.lang = code;
    button.setAttribute("aria-label", name);
    button.dataset.lang = code;
    button.addEventListener("click", () => setLang(code));
    group.append(button);
  }
  const sync = () =>
    group.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.lang === getLang())),
    );
  sync();
  onLangChange(sync);
  return group;
}

function renderHeader(header) {
  header.replaceChildren();
  const inner = document.createElement("div");
  inner.className = "header-inner wrap";
  const nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.dataset.i18nAttr = "aria-label:nav.label";
  LINKS.forEach((item) => nav.append(navLink(item)));
  inner.append(brand("brand"), nav, languageToggle());
  header.append(inner);
}

function renderFooter(footer) {
  footer.className = "site-footer";
  footer.replaceChildren();
  const inner = document.createElement("div");
  inner.className = "footer-inner wrap";

  const about = document.createElement("div");
  about.className = "footer-about";
  const blurb = document.createElement("p");
  blurb.dataset.i18n = "footer.blurb";
  about.append(brand("brand"), blurb);

  const nav = document.createElement("nav");
  nav.className = "footer-nav";
  nav.dataset.i18nAttr = "aria-label:footer.explore";
  LINKS.forEach((item) => nav.append(navLink(item)));
  const source = document.createElement("a");
  source.href = "https://data.gov.in/";
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  const sourceText = document.createElement("span");
  sourceText.dataset.i18n = "footer.source";
  source.append(sourceText, icon("external", 14));
  nav.append(source);

  const bottom = document.createElement("div");
  bottom.className = "footer-bottom";
  const rights = document.createElement("span");
  rights.dataset.year = String(new Date().getFullYear());
  const note = document.createElement("span");
  note.dataset.i18n = "footer.note";
  bottom.append(rights, note);
  const renderRights = () => (rights.textContent = t("footer.rights", { year: rights.dataset.year }));

  inner.append(about, nav, bottom);
  footer.append(inner);
  renderRights();
  onLangChange(renderRights);
}

const header = document.querySelector("header.site-header");
if (header) renderHeader(header);
let footer = document.querySelector("footer.site-footer");
if (!footer) {
  footer = document.createElement("footer");
  document.body.append(footer);
}
renderFooter(footer);
applyI18n();
hydrateIcons();
