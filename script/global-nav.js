import { applyI18n, getLang, setLang, onLangChange, t } from "./i18n.js";
import { hydrateIcons, icon } from "./icons.js";
import { showFirstVisitWelcome } from "./onboarding.js";
import { startMandiNavGuide } from "./mandi-nav-guide.js";

const asyncFontStylesheet = document.querySelector('link[data-async-fonts]');
if (asyncFontStylesheet) asyncFontStylesheet.media = "all";

const LOGO_URL = new URL("../Images/Logo.webp", import.meta.url).href;

const LINKS = [
  ["nav.home", "index.html"],
  ["nav.prices", "mandi-prices.html"],
  ["nav.weather", "weather.html"],
  ["nav.about", "about.html"],
  ["nav.contact", "contact.html"],
];

const currentPage = window.location.pathname.split("/").pop()?.toLowerCase() || "index.html";

// Shared Light / Dark theme preference with a smooth top-to-bottom View Transition.
const THEME_KEY = "rateGptTheme";
const THEME_TRANSITION_DURATION = 560;
let themeTransitionRunning = false;
let activeThemeAnimation = null;

function syncThemeToggle(button, theme) {
  const dark = theme === "dark";
  button.setAttribute("aria-pressed", String(dark));
  button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  button.title = dark ? "Switch to light mode" : "Switch to dark mode";
  button.innerHTML = dark
    ? '<span aria-hidden="true">☀</span>'
    : '<span aria-hidden="true">☾</span>';
}

function applyTheme(theme, persist = true) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  if (persist) {
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage may be blocked */ }
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", next === "dark" ? "#111a16" : "#f7f7f0");
  document.querySelectorAll("[data-theme-toggle]").forEach(button => syncThemeToggle(button, next));
}

function cleanupThemeTransition(root) {
  themeTransitionRunning = false;
  delete root.dataset.magicuiThemeVt;
  root.style.removeProperty("--magicui-theme-toggle-vt-duration");
  root.style.removeProperty("--magicui-theme-vt-clip-from");
  activeThemeAnimation?.cancel();
  activeThemeAnimation = null;
}

function themeToggle() {
  const button = document.createElement("button");
  button.className = "theme-toggle";
  button.type = "button";
  button.dataset.themeToggle = "";
  button.addEventListener("click", () => {
    const root = document.documentElement;
    if (themeTransitionRunning || root.dataset.magicuiThemeVt === "active") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pageIsVisible = document.visibilityState === "visible";
    if (typeof document.startViewTransition !== "function" ||
        !pageIsVisible || reducedMotion) {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
      return;
    }

    // Reveal the incoming theme from the top edge down: no sudden circular flash.
    const clipPaths = [
      "inset(0 0 100% 0)",
      "inset(0 0 0 0)"
    ];

    themeTransitionRunning = true;
    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty("--magicui-theme-toggle-vt-duration", `${THEME_TRANSITION_DURATION}ms`);
    root.style.setProperty("--magicui-theme-vt-clip-from", clipPaths[0]);

    let transition;
    try {
      transition = document.startViewTransition(() => {
        applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
      });
    } catch {
      cleanupThemeTransition(root);
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
      return;
    }

    if (transition?.finished?.finally) {
      transition.finished.finally(() => cleanupThemeTransition(root)).catch(() => {});
    } else {
      cleanupThemeTransition(root);
    }

    transition?.ready?.then(() => {
      activeThemeAnimation = root.animate(
        { clipPath: clipPaths },
        {
          duration: THEME_TRANSITION_DURATION,
          easing: "cubic-bezier(.22, 1, .36, 1)",
          fill: "forwards",
          pseudoElement: "::view-transition-new(root)"
        }
      );
    }).catch(() => {});
  });
  syncThemeToggle(button, document.documentElement.dataset.theme || "light");
  return button;
}

try {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme, false);
  } else {
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light", false);
  }
} catch {
  applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light", false);
}
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const followSystemTheme = (event) => {
  try {
    if (localStorage.getItem(THEME_KEY) === null) applyTheme(event.matches ? "dark" : "light", false);
  } catch {
    applyTheme(event.matches ? "dark" : "light", false);
  }
};
systemTheme.addEventListener?.("change", followSystemTheme);
if (!document.querySelector('link[data-theme-styles]')) {
  const themeStyles = document.createElement("link");
  themeStyles.rel = "stylesheet";
  themeStyles.href = "/style/theme.css?v=magicui-circle-reveal-20261126";
  themeStyles.dataset.themeStyles = "";
  document.head.append(themeStyles);
}



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
  img.src = LOGO_URL; img.alt = "Rate-GPT logo"; img.width = 70; img.height = 70; img.decoding = "async";
  mark.append(img);
  const text = document.createElement("span"); text.className = "brand-text";
  const name = document.createElement("strong"); name.textContent = "Rate-GPT";
  const tag = document.createElement("small"); tag.dataset.i18n = "brand.tag";
  text.append(name, tag); a.append(mark, text); return a;
}
function languageToggle() {
  const group = document.createElement("div");
  group.className = "lang-toggle"; group.setAttribute("role", "group");
  group.dataset.i18nAttr = "aria-label:lang.label";
  for (const [code, label, name] of [["en","EN","English"],["hi","हिं","हिन्दी"]]) {
    const button = document.createElement("button"); button.type = "button"; button.textContent = label;
    button.lang = code; button.setAttribute("aria-label", name); button.dataset.lang = code;
    button.addEventListener("click", () => setLang(code)); group.append(button);
  }
  const sync = () => group.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === getLang())));
  sync(); onLangChange(sync); return group;
}
function renderHeader(header) {
  header.replaceChildren(); header.classList.add("has-mobile-drawer");
  const inner = document.createElement("div"); inner.className = "header-inner wrap";
  const toggle = document.createElement("button");
  toggle.className = "menu-toggle"; toggle.type = "button"; toggle.setAttribute("aria-expanded","false");
  toggle.setAttribute("aria-controls","primaryNavigation"); toggle.setAttribute("aria-label", getLang()==="hi" ? "मेनू खोलें" : "Open menu");
  toggle.innerHTML = '<span></span><span></span><span></span>';
  const nav = document.createElement("nav"); nav.className = "site-nav"; nav.id = "primaryNavigation";
  nav.dataset.i18nAttr = "aria-label:nav.label"; LINKS.forEach(item => nav.append(navLink(item)));
  const actions = document.createElement("div"); actions.className = "header-actions";
  actions.append(languageToggle(), themeToggle(), toggle);
  inner.append(brand("brand"), nav, actions); header.append(inner);
  const backdrop = document.createElement("button"); backdrop.className = "nav-backdrop";
  backdrop.type = "button"; backdrop.tabIndex = -1; backdrop.setAttribute("aria-label", getLang()==="hi" ? "मेनू बंद करें" : "Close menu");
  document.body.append(backdrop);
  const close = ({ restoreFocus = false } = {}) => {
    nav.classList.remove("is-open"); backdrop.classList.remove("is-visible"); header.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded","false");
    toggle.setAttribute("aria-label", getLang()==="hi" ? "मेनू खोलें" : "Open menu");
    if (restoreFocus) toggle.focus();
  };
  const open = () => {
    nav.classList.add("is-open"); backdrop.classList.add("is-visible"); header.classList.add("menu-open");
    toggle.setAttribute("aria-expanded","true");
    toggle.setAttribute("aria-label", getLang()==="hi" ? "मेनू बंद करें" : "Close menu");
    nav.querySelector("a")?.focus();
  };
  toggle.addEventListener("click", () => toggle.getAttribute("aria-expanded")==="true" ? close() : open());
  backdrop.addEventListener("click", () => close({ restoreFocus: true }));
  nav.addEventListener("click", e => { if (e.target.closest("a")) close(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      close({ restoreFocus: true });
      return;
    }
    if (e.key !== "Tab" || !nav.classList.contains("is-open")) return;
    const focusable = [...nav.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || !nav.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !nav.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  });
  const mq = window.matchMedia("(min-width: 901px)");
  mq.addEventListener?.("change", e => { if (e.matches) close(); });
}
function renderFooter(footer) {
  footer.replaceChildren();
  footer.classList.add("site-footer");

  const inner = document.createElement("div");
  inner.className = "footer-inner wrap";

  const about = document.createElement("section");
  about.className = "footer-about";
  about.setAttribute("aria-label", "Rate-GPT");
  const blurb = document.createElement("p");
  blurb.dataset.i18n = "footer.blurb";

  const source = document.createElement("a");
  source.className = "footer-source";
  source.href = "https://data.gov.in/";
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  const sourceText = document.createElement("span");
  sourceText.dataset.i18n = "footer.source";
  source.append(sourceText, icon("external", 14));
  about.append(brand("brand"), blurb, source);

  const linksSection = document.createElement("section");
  linksSection.className = "footer-links-section";
  const linksHeading = document.createElement("h2");
  linksHeading.className = "footer-heading";
  linksHeading.dataset.i18n = "footer.linksHeading";
  const nav = document.createElement("nav");
  nav.className = "footer-nav";
  nav.dataset.i18nAttr = "aria-label:footer.explore";
  LINKS.forEach(item => nav.append(navLink(item)));
  for (const [key, href] of [["footer.privacy", "privacy.html"], ["footer.terms", "terms.html"]]) {
    nav.append(navLink([key, href]));
  }
  linksSection.append(linksHeading, nav);

  const help = document.createElement("section");
  help.className = "footer-help";
  help.setAttribute("aria-labelledby", "footerHelpTitle");
  const heading = document.createElement("h2");
  heading.className = "footer-heading";
  heading.id = "footerHelpTitle";
  heading.dataset.i18n = "footer.farmerHelp";
  const desc = document.createElement("p");
  desc.className = "footer-help-text";
  desc.dataset.i18n = "footer.farmerHelpText";
  const phone = document.createElement("a");
  phone.href = "tel:18001801551";
  phone.className = "footer-helpline";
  phone.textContent = "1800-180-1551";
  const hours = document.createElement("small");
  hours.className = "footer-hours";
  hours.dataset.i18n = "footer.farmerHours";
  const govt = document.createElement("a");
  govt.className = "footer-official-link";
  govt.href = "https://dackkms.gov.in/account/aboutus.aspx";
  govt.target = "_blank";
  govt.rel = "noopener noreferrer";
  govt.dataset.i18n = "footer.officialInfo";
  help.append(heading, desc, phone, hours, govt);

  const bottom = document.createElement("div");
  bottom.className = "footer-bottom";
  const rights = document.createElement("span");
  rights.dataset.year = String(new Date().getFullYear());
  const note = document.createElement("span");
  note.dataset.i18n = "footer.note";
  bottom.append(rights, note);

  const renderRights = () => {
    rights.textContent = t("footer.rights", { year: rights.dataset.year });
  };

  inner.append(about, linksSection, help, bottom);
  footer.append(inner);
  renderRights();
  onLangChange(renderRights);
}
const header=document.querySelector("header.site-header"); if(header) renderHeader(header);
let footer=document.querySelector("footer.site-footer");
if(!footer){footer=document.createElement("footer");document.body.append(footer);}
renderFooter(footer);
applyI18n();

// Track a visit in this browser profile, not just completion of the welcome
// dialog. localStorage is scoped to this site and browser profile, so a new
// device/profile gets its own first-visit experience.
const DEVICE_VISIT_KEY = "rateGptDeviceVisited";
let hasVisitedSite = false;
try {
  hasVisitedSite =
    window.localStorage.getItem(DEVICE_VISIT_KEY) === "1" ||
    window.localStorage.getItem("rateGptWelcomeSeen") === "1" ||
    // Older visitors may already have a saved language preference from before
    // device-visit tracking was introduced.
    window.localStorage.getItem("rategpt.lang") !== null;
  if (!hasVisitedSite) window.localStorage.setItem(DEVICE_VISIT_KEY, "1");
} catch {
  // If browser storage is blocked, the welcome can still be shown this visit.
}

// The welcome is homepage-only. A device that has already visited any
// Rate-GPT page will not see it later; manual replay remains available.
if (!hasVisitedSite && currentPage === "index.html" && document.body.classList.contains("page-home")) {
  showFirstVisitWelcome();
}
function applySharedTranslations() {
  const hi = getLang() === "hi";
  const labels = {
    "nav.contact": hi ? "संपर्क करें" : "Contact",
    "footer.contact": hi ? "संपर्क करें" : "Contact",
    "footer.privacy": hi ? "गोपनीयता नीति" : "Privacy Policy",
    "footer.terms": hi ? "नियम और शर्तें" : "Terms & Conditions",
    "footer.farmerHelp": hi ? "किसान सहायता" : "Farmer support",
    "footer.farmerHelpText": hi ? "खेती से जुड़ी सलाह के लिए भारत सरकार के किसान कॉल सेंटर से संपर्क करें।" : "For agriculture-related guidance, contact the Government of India Kisan Call Centre.",
    "footer.farmerHours": hi ? "टोल-फ्री · सुबह 6 से रात 10 बजे · सप्ताह के सातों दिन" : "Toll-free · 6 AM–10 PM · 7 days a week",
    "footer.officialInfo": hi ? "आधिकारिक जानकारी ↗" : "Official information ↗",
    "nav.label": hi ? "मुख्य मेनू" : "Main navigation",
    "footer.explore": hi ? "लिंक और जानकारी" : "Explore and support",
    "footer.linksHeading": hi ? "ज़रूरी लिंक" : "Quick links"
  };
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const value = labels[el.dataset.i18n];
    if (value) el.textContent = value;
  });
  document.querySelectorAll("[data-i18n-attr]").forEach(el => {
    if (el.dataset.i18nAttr.includes("aria-label:nav.label")) el.setAttribute("aria-label", labels["nav.label"]);
    if (el.dataset.i18nAttr.includes("aria-label:footer.explore")) el.setAttribute("aria-label", labels["footer.explore"]);
  });
}
applySharedTranslations();
onLangChange(applySharedTranslations);

// Localise the static educational sections without replacing their semantic HTML.
function applyEditorialTranslations() {
  const language = getLang() === "hi" ? "hi" : "en";
  document.querySelectorAll("[data-en][data-hi]").forEach((element) => {
    if (element.id === "contactConsentText") return;
    const translated = element.dataset[language];
    if (translated) element.textContent = translated;
  });
}
applyEditorialTranslations();
onLangChange(applyEditorialTranslations);

hydrateIcons();

// Progressive web app support. The service worker caches only static shell
// assets and never intercepts /api responses or user data.
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // The website remains fully usable when service workers are unavailable.
    });
  }, { once: true });
}
