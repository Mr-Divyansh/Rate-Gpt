import { getLang, onLangChange } from "./i18n.js";

// This is the actual, user-requested website tutorial. It is deliberately
// started from the Demo menu instead of appearing automatically on every visit.
export function startMandiNavGuide() {
  if (!document.body.classList.contains("page-home")) {
    window.location.href = "index.html?startWebsiteTutorial=1";
    return;
  }

  const hero = document.querySelector(".page-home .hero");
  const pricesLink = document.querySelector('.site-nav a[href="mandi-prices.html"]');
  if (!hero || !pricesLink) return;

  // Avoid stacking duplicate guide cards when the visitor opens Demo repeatedly.
  document.querySelector(".mandi-nav-guide")?.remove();
  pricesLink.classList.add("is-guide-highlighted");
  pricesLink.setAttribute("aria-describedby", "mandiNavGuideText");

  const guide = document.createElement("aside");
  guide.className = "mandi-nav-guide";
  guide.setAttribute("aria-label", "Mandi Prices website tutorial");

  const farmer = document.createElement("img");
  farmer.className = "mandi-nav-guide__farmer";
  farmer.src = new URL("../Images/Characte_For_RateGPT/Characte_For_RateGPT_Point.png", import.meta.url).href;
  farmer.alt = "";
  farmer.width = 240;
  farmer.height = 260;
  farmer.loading = "eager";
  farmer.decoding = "async";

  const copy = document.createElement("div");
  copy.className = "mandi-nav-guide__copy";

  const close = document.createElement("button");
  close.className = "mandi-nav-guide__close";
  close.type = "button";
  close.setAttribute("aria-label", getLang() === "hi" ? "ट्यूटोरियल बंद करें" : "Close tutorial");
  close.textContent = "×";

  const eyebrow = document.createElement("span");
  eyebrow.className = "mandi-nav-guide__eyebrow";

  const message = document.createElement("p");
  message.id = "mandiNavGuideText";
  message.className = "mandi-nav-guide__message";

  const action = document.createElement("a");
  action.className = "mandi-nav-guide__action";
  action.href = "mandi-prices.html";

  const stopGuide = () => {
    guide.remove();
    pricesLink.classList.remove("is-guide-highlighted");
    pricesLink.removeAttribute("aria-describedby");
    document.removeEventListener("keydown", onEscape);
  };
  const onEscape = event => {
    if (event.key === "Escape") {
      stopGuide();
      close.focus();
    }
  };

  const syncLanguage = () => {
    const hi = getLang() === "hi";
    guide.setAttribute("aria-label", hi ? "मंडी भाव देखने का वेबसाइट ट्यूटोरियल" : "Mandi Prices website tutorial");
    close.setAttribute("aria-label", hi ? "ट्यूटोरियल बंद करें" : "Close tutorial");
    eyebrow.textContent = hi ? "वेबसाइट ट्यूटोरियल" : "WEBSITE TUTORIAL";
    message.textContent = hi
      ? "अपनी फसल के मंडी भाव देखने के लिए ऊपर हाइलाइट किए गए Mandi prices पर क्लिक करें।"
      : "Click the highlighted Mandi prices tab above to explore crop prices.";
    action.textContent = hi ? "यहाँ क्लिक करें · मंडी भाव देखें →" : "Click here · Explore Mandi Prices →";
  };

  close.addEventListener("click", stopGuide);
  action.addEventListener("click", stopGuide);
  pricesLink.addEventListener("click", stopGuide, { once: true });
  document.addEventListener("keydown", onEscape);
  copy.append(close, eyebrow, message, action);
  guide.append(farmer, copy);
  hero.prepend(guide);
  syncLanguage();
  onLangChange(syncLanguage);
  action.focus();
}
