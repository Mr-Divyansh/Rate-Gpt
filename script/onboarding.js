export function showFirstVisitWelcome() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("../style/onboarding.css", import.meta.url).href;
  document.head.append(link);

  const hi = document.documentElement.lang.toLowerCase().startsWith("hi");
  const dialog = document.createElement("dialog");
  dialog.className = "onboarding-dialog";
  dialog.setAttribute("aria-labelledby", "onboardingTitle");

  let thankYouShown = false;
  const closeDialog = () => {
    if (dialog.open) dialog.close();
    dialog.remove();
  };

  // This is the farmer-benefits introduction shown before any detailed tour.
  // Keep the copy focused on real farmer decisions Rate-GPT can support:
  // comparing available mandi prices, finding alternatives, and reading price data.
  const showThankYou = () => {
    thankYouShown = true;
    dialog.innerHTML = `
      <div class="onboarding-card onboarding-card--thanks onboarding-card--benefits">
        <button class="onboarding-close" type="button" aria-label="${hi ? "बंद करें" : "Close"}">×</button>
        <div class="onboarding-art-wrap">
          <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Thinking.png" alt="${hi ? "सोचता हुआ किसान" : "Farmer thinking about crop prices"}" width="320" height="320" fetchpriority="high" decoding="async">
        </div>
        <div class="onboarding-copy">
          <p class="onboarding-eyebrow">${hi ? "आपकी खेती के फैसलों में मदद" : "A SMARTER WAY TO CHECK MANDI PRICES"}</p>
          <h2 id="onboardingTitle">${hi ? "क्या आपकी फसल का बेहतर भाव मिल सकता है?" : "Could your crop get a better mandi price?"}</h2>
          <p class="onboarding-message">${hi
            ? "कई बार किसान को पता नहीं होता कि दूसरी मंडियों में उसी फसल का क्या भाव चल रहा है। सही जानकारी न होने से बेहतर बिक्री का मौका छूट सकता है। Rate-GPT इस जानकारी को समझना आसान बनाता है।"
            : "Farmers may not know what the same crop is selling for in other mandis. Without that information, it can be difficult to spot a better selling opportunity. Rate-GPT makes those market details easier to explore."}</p>
          <ul class="onboarding-benefits">
            <li>${hi ? "अलग-अलग मंडियों में अपनी फसल के उपलब्ध भाव देखकर बेहतर विकल्प पहचानें।" : "Explore available prices for your crop across different mandis to spot other selling options."}</li>
            <li>${hi ? "सिर्फ अपनी नजदीकी मंडी तक सीमित न रहें — दूसरी मंडियों के भाव भी जानें।" : "Look beyond your usual local mandi and discover prices reported by other markets."}</li>
            <li>${hi ? "न्यूनतम, अधिकतम, मॉडल भाव और आवक की जानकारी से सोच-समझकर फैसला लें।" : "Use minimum, maximum and modal prices, along with arrivals, to make a more informed decision."}</li>
          </ul>
          <p class="onboarding-note onboarding-assistant-note">${hi ? "चिंता न करें — आपका Rate-GPT किसान सहायक आपकी मदद के लिए यहाँ है।" : "Don’t worry — your Rate-GPT Farmer Assistant is here to help."}</p>
          <div class="onboarding-actions onboarding-actions--single">
            <button class="btn btn-primary onboarding-continue" type="button">${hi ? "जारी रखें" : "Continue"} <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
    `;
    // Both the Skip and View paths lead to this short benefits introduction.
    // Continue closes this intro for now; the detailed step-by-step tour can
    // be added later without changing the farmer-benefits content.
    dialog.querySelector(".onboarding-close").addEventListener("click", closeDialog);
    dialog.querySelector(".onboarding-continue").addEventListener("click", closeDialog);
    dialog.querySelector(".onboarding-continue").focus();
  };

  dialog.innerHTML = `
    <div class="onboarding-card">
      <button class="onboarding-close" type="button" aria-label="${hi ? "बंद करें" : "Close"}">×</button>
      <div class="onboarding-art-wrap">
        <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Namaste.png" alt="" width="320" height="320" fetchpriority="low" decoding="async">
      </div>
      <div class="onboarding-copy">
        <p class="onboarding-eyebrow">${hi ? "RATE-GPT में आपका स्वागत है" : "WELCOME TO RATE-GPT"}</p>
        <h2 id="onboardingTitle">${hi ? "नमस्ते! पहली बार आए हैं?" : "Hello! First time here?"}</h2>
        <p class="onboarding-message">${hi
          ? "क्या आप Rate-GPT इस्तेमाल करना सीखना चाहेंगे? हमारा Farmer Assistant आपको मंडी भाव देखने और वेबसाइट की सुविधाएँ समझने में मदद करेगा।"
          : "Would you like a quick tour? Your Farmer Assistant can show you how to explore mandi prices and use Rate-GPT with ease."}</p>
        <div class="onboarding-actions">
          <button class="btn btn-primary onboarding-view" type="button">${hi ? "ट्यूटोरियल देखें" : "View tutorial"}</button>
          <button class="btn onboarding-skip" type="button">${hi ? "ट्यूटोरियल छोड़ें" : "Skip tutorial"}</button>
        </div>
        <p class="onboarding-note">${hi ? "आप बाद में भी मदद ले सकते हैं।" : "You can explore Rate-GPT at your own pace."}</p>
      </div>
    </div>
  `;

  document.body.append(dialog);
  dialog.querySelector(".onboarding-skip").addEventListener("click", showThankYou);
  dialog.querySelector(".onboarding-close").addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    if (thankYouShown) closeDialog();
    else showThankYou();
  });

  // The old "Let's explore mandi prices" Step 1 screen is intentionally
  // removed from the active flow for now. The detailed navigation tutorial
  // can be brought back as a later step after this benefits introduction.
  dialog.querySelector(".onboarding-view").addEventListener("click", showThankYou);

  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });

  dialog.showModal();
  dialog.querySelector(".onboarding-view").focus();
}
