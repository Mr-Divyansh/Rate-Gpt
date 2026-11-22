import { getLang, onLangChange } from "./i18n.js";

// The guide is intentionally homepage-only. It is visible on every homepage
// load while the visitor is exploring the site, rather than being stored as
// a one-time dismissal preference during the current testing phase.
if (document.body.classList.contains("page-home")) {
  const hero = document.querySelector(".page-home .hero");
  const pricesLink = document.querySelector('.site-nav a[href="mandi-prices.html"]');

  if (hero && pricesLink) {
    pricesLink.classList.add("is-guide-highlighted");
    pricesLink.setAttribute("aria-describedby", "mandiNavGuideText");

    const guide = document.createElement("aside");
    guide.className = "mandi-nav-guide";
    guide.setAttribute("aria-label", "Mandi Prices navigation tip");

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

    const eyebrow = document.createElement("span");
    eyebrow.className = "mandi-nav-guide__eyebrow";

    const message = document.createElement("p");
    message.id = "mandiNavGuideText";
    message.className = "mandi-nav-guide__message";

    const action = document.createElement("a");
    action.className = "mandi-nav-guide__action";
    action.href = "mandi-prices.html";

    const syncLanguage = () => {
      const hi = getLang() === "hi";
      guide.setAttribute("aria-label", hi ? "मंडी भाव देखने के लिए सुझाव" : "Mandi Prices navigation tip");
      eyebrow.textContent = hi ? "यहाँ से शुरू करें" : "START EXPLORING";
      message.textContent = hi
        ? "अपनी फसल के मंडी भाव देखने के लिए यहाँ क्लिक करें।"
        : "Want to check crop prices? Open Mandi Prices here.";
      action.textContent = hi ? "मंडी भाव देखने के लिए यहाँ क्लिक करें" : "Click here to explore Mandi Prices";
    };

    copy.append(eyebrow, message, action);
    guide.append(farmer, copy);
    hero.prepend(guide);
    syncLanguage();
    onLangChange(syncLanguage);
  }
}
