export function showFirstVisitWelcome() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("../style/onboarding.css", import.meta.url).href;
  document.head.append(link);

  const hi = document.documentElement.lang.toLowerCase().startsWith("hi");
  const dialog = document.createElement("dialog");
  dialog.className = "onboarding-dialog";
  dialog.setAttribute("aria-labelledby", "onboardingTitle");

  const closeDialog = () => {
    if (dialog.open) dialog.close();
    dialog.remove();
  };

  const showThankYou = () => {
    dialog.innerHTML = `
      <div class="onboarding-card onboarding-card--thanks">
        <button class="onboarding-close" type="button" aria-label="${hi ? "बंद करें" : "Close"}">×</button>
        <div class="onboarding-art-wrap">
          <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Thinking.png" alt="" width="320" height="320" loading="lazy" decoding="async">
        </div>
        <div class="onboarding-copy">
          <p class="onboarding-eyebrow">${hi ? "RATE-GPT · किसानों के लिए" : "RATE-GPT · MADE FOR FARMERS"}</p>
          <h2 id="onboardingTitle">${hi ? "Rate-GPT को जानने के लिए धन्यवाद!" : "Thanks for checking out Rate-GPT!"}</h2>
          <p class="onboarding-message">${hi ? "Rate-GPT आपको बेहतर जानकारी के साथ मंडी में अपनी फसल बेचने की योजना बनाने में मदद करता है।" : "Rate-GPT helps you make more informed decisions when planning where and when to sell your crops."}</p>
          <ul class="onboarding-benefits">
            <li>${hi ? "एक ही फसल के अलग-अलग मंडियों के भाव की तुलना करें।" : "Compare prices for the same crop across different mandis."}</li>
            <li>${hi ? "अपने आसपास और दूसरी मंडियों में बेहतर भाव के मौके पहचानें।" : "Spot better price opportunities beyond your usual local mandi."}</li>
            <li>${hi ? "न्यूनतम, अधिकतम, मॉडल भाव और आवक तारीख देखकर बिक्री की योजना बनाएं।" : "Use min, max, modal prices and arrival dates to plan your sale with better information."}</li>
          </ul>
          <p class="onboarding-note onboarding-assistant-note">${hi ? "चिंता न करें — आपका Farmer Assistant रास्ता दिखाने के लिए यहाँ है।" : "Don’t worry — your Farmer Assistant is here to help you along the way."}</p>
          <div class="onboarding-actions onboarding-actions--single">
            <button class="btn btn-primary onboarding-continue" type="button">${hi ? "जारी रखें" : "Continue"} <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
    `;
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
    showThankYou();
  });

  dialog.querySelector(".onboarding-view").addEventListener("click", () => {
    dialog.innerHTML = `
      <div class="onboarding-card onboarding-card--step">
        <button class="onboarding-close" type="button" aria-label="${hi ? "बंद करें" : "Close"}">×</button>
        <div class="onboarding-art-wrap">
          <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Point.png" alt="" width="320" height="320" loading="lazy" decoding="async">
        </div>
        <div class="onboarding-copy">
          <p class="onboarding-eyebrow">${hi ? "ट्यूटोरियल · पहला कदम" : "YOUR QUICK TOUR · STEP 1"}</p>
          <h2>${hi ? "मंडी के भाव देखना शुरू करें" : "Let’s explore mandi prices"}</h2>
          <p class="onboarding-message">${hi
            ? "ऊपर Mandi Prices खोलें। वहाँ अपना State, District और Mandi चुनकर उपलब्ध फसलों के ताज़ा सरकारी भाव देख सकते हैं।"
            : "Open Mandi Prices from the navigation. Choose your State, District and Mandi to explore the latest available government-reported crop prices."}</p>
          <div class="onboarding-actions">
            <a class="btn btn-primary onboarding-explore" href="/mandi-prices.html">${hi ? "मंडी भाव देखें" : "Explore mandi prices"} <span aria-hidden="true">→</span></a>
            <button class="btn onboarding-done" type="button">${hi ? "अभी बाद में" : "Maybe later"}</button>
          </div>
        </div>
      </div>
    `;
    dialog.querySelector(".onboarding-close").addEventListener("click", closeDialog);
    dialog.querySelector(".onboarding-done").addEventListener("click", closeDialog);
    dialog.querySelector(".onboarding-close").focus();
  });

  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });

  dialog.showModal();
  dialog.querySelector(".onboarding-view").focus();
}
