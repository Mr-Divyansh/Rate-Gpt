import { getLang, onLangChange } from "./i18n.js";

// The spotlight tour is launched after the visitor completes the introduction,
// and can also be opened intentionally from the Demo menu.
export function startMandiNavGuide() {
  if (!document.body.classList.contains("page-home")) {
    window.location.href = "index.html?startWebsiteTutorial=1";
    return;
  }

  const pricesLink = document.querySelector('.site-nav a[href="mandi-prices.html"]');
  if (!pricesLink) return;

  document.querySelector(".mandi-nav-guide")?.remove();
  const mobileToggle = document.querySelector(".menu-toggle");
  if (window.matchMedia("(max-width: 720px)").matches &&
      !document.querySelector(".site-nav")?.classList.contains("is-open")) {
    mobileToggle?.click();
  }

  const guide = document.createElement("div");
  guide.className = "mandi-nav-guide";
  guide.setAttribute("role", "presentation");

  const backdrop = document.createElement("div");
  backdrop.className = "mandi-nav-guide__backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  const farmer = document.createElement("img");
  farmer.className = "mandi-nav-guide__farmer";
  farmer.src = new URL("../Images/Characte_For_RateGPT/Characte_For_RateGPT_Point.png", import.meta.url).href;
  farmer.alt = "";
  farmer.width = 300;
  farmer.height = 320;
  farmer.loading = "eager";
  farmer.decoding = "async";

  const copy = document.createElement("section");
  copy.className = "mandi-nav-guide__copy";
  copy.setAttribute("role", "dialog");
  copy.setAttribute("aria-modal", "false");
  copy.setAttribute("aria-labelledby", "mandiNavGuideTitle");

  const eyebrow = document.createElement("span");
  eyebrow.className = "mandi-nav-guide__eyebrow";

  const title = document.createElement("h2");
  title.id = "mandiNavGuideTitle";
  title.className = "mandi-nav-guide__title";

  const message = document.createElement("p");
  message.id = "mandiNavGuideText";
  message.className = "mandi-nav-guide__message";

  const action = document.createElement("a");
  action.className = "mandi-nav-guide__action";
  action.href = "mandi-prices.html";

  const stopGuide = ({ restoreFocus = false } = {}) => {
    guide.remove();
    pricesLink.classList.remove("is-guide-highlighted");
    pricesLink.removeAttribute("aria-describedby");
    document.removeEventListener("keydown", onEscape);
    window.removeEventListener("resize", positionGuide);
    window.removeEventListener("scroll", positionGuide, true);
    if (restoreFocus) pricesLink.focus();
  };

  const onEscape = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      stopGuide({ restoreFocus: true });
    }
  };

  const syncLanguage = () => {
    const hi = getLang() === "hi";
    guide.setAttribute("aria-label", hi ? "मंडी भाव देखने का ट्यूटोरियल" : "Mandi Prices website tutorial");
    eyebrow.textContent = hi ? "आपका Rate-GPT गाइड" : "YOUR RATE-GPT GUIDE";
    title.textContent = hi ? "मंडी के भाव यहाँ देखें" : "Explore Mandi Prices here";
    message.textContent = hi
      ? "अपनी फसल के सरकारी मंडी भाव, अलग-अलग मंडियों की कीमतें और उनकी तुलना देखने के लिए ऊपर हाइलाइट किए गए Mandi prices पर क्लिक करें।"
      : "Click the highlighted Mandi prices tab to check government-reported crop prices and compare rates across mandis.";
    action.textContent = hi ? "मंडी के भाव देखें · यहाँ क्लिक करें →" : "Click here · Explore Mandi Prices →";
  };

  function positionGuide() {
    const rect = pricesLink.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    guide.style.setProperty("--spot-x", centerX + "px");
    guide.style.setProperty("--spot-y", centerY + "px");
    pricesLink.classList.add("is-guide-highlighted");
    pricesLink.setAttribute("aria-describedby", "mandiNavGuideText");

    const compact = window.innerWidth < 900;
    guide.classList.toggle("is-compact", compact);
    const bubbleWidth = Math.min(compact ? window.innerWidth - 32 : 370, 370);
    const bubbleLeft = Math.max(16, Math.min(rect.left - 8, window.innerWidth - bubbleWidth - 16));
    const belowNav = rect.bottom + 22;
    const bubbleTop = Math.min(belowNav, Math.max(90, window.innerHeight - (compact ? 300 : 280)));
    copy.style.left = bubbleLeft + "px";
    copy.style.top = bubbleTop + "px";
    copy.style.width = bubbleWidth + "px";

    if (compact) {
      farmer.style.left = Math.max(16, Math.min(bubbleLeft + bubbleWidth - 150, window.innerWidth - 166)) + "px";
      farmer.style.top = Math.min(bubbleTop + copy.offsetHeight + 4, window.innerHeight - 190) + "px";
    } else {
      farmer.style.left = Math.min(bubbleLeft + bubbleWidth - 6, window.innerWidth - 250) + "px";
      farmer.style.top = Math.max(78, bubbleTop - 38) + "px";
    }
  }

  action.addEventListener("click", () => stopGuide());
  pricesLink.addEventListener("click", () => stopGuide(), { once: true });
  document.addEventListener("keydown", onEscape);
  copy.append(eyebrow, title, message, action);
  guide.append(backdrop, copy, farmer);
  document.body.append(guide);
  syncLanguage();
  positionGuide();
  window.addEventListener("resize", positionGuide);
  window.addEventListener("scroll", positionGuide, true);
  onLangChange(syncLanguage);
  action.focus();
}
