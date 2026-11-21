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
          <div class="onboarding-progress" role="group" aria-label="${hi ? "परिचय की प्रगति" : "Introduction progress"}">
            <div class="onboarding-progress-meta">
              <span>${hi ? "आपकी Rate-GPT यात्रा" : "YOUR RATE-GPT JOURNEY"}</span>
              <span>${hi ? "01 / 02" : "01 / 02"}</span>
            </div>
            <div class="onboarding-progress-track" role="progressbar" aria-label="${hi ? "परिचय की प्रगति" : "Introduction progress"}" aria-valuemin="0" aria-valuemax="2" aria-valuenow="1">
              <span></span>
            </div>
          </div>
          <p class="onboarding-eyebrow">${hi ? "किसानों की रोज़मर्रा की चुनौतियाँ" : "REAL CHALLENGES. CLEARER MARKET INFORMATION."}</p>
          <h2 id="onboardingTitle">${hi ? "फसल बेचने से पहले सही मंडी का भाव जानें" : "Know your mandi options before you sell"}</h2>
          <p class="onboarding-message">${hi
            ? "किसानों के सामने अक्सर एक बड़ा सवाल होता है — मेरी फसल का सही भाव कहाँ मिल सकता है? हर मंडी का भाव पता करना और उनकी तुलना करना आसान नहीं होता। Rate-GPT यह जानकारी एक जगह समझने में मदद करता है।"
            : "One big question for farmers is: where can I find a better price for my crop? Checking different mandis and comparing their rates is not always easy. Rate-GPT brings useful market information together so you can compare your options."}</p>
          <ul class="onboarding-benefits">
            <li>${hi ? "मंडी की जानकारी: जानें कि आपकी फसल के भाव अलग-अलग मंडियों में क्या चल रहे हैं।" : "See market differences: Check how prices for your crop vary across available mandis."}</li>
            <li>${hi ? "बेहतर विकल्प खोजें: सिर्फ एक मंडी पर निर्भर रहने के बजाय दूसरी मंडियों से तुलना करें।" : "Compare before deciding: Look beyond one mandi and explore other reported market options."}</li>
            <li>${hi ? "भाव को समझें: न्यूनतम, अधिकतम, मॉडल भाव और आवक देखकर जानकारी के साथ फैसला लें।" : "Understand the rates: Use minimum, maximum, modal prices and arrivals to make a more informed choice."}</li>
          </ul>
          <p class="onboarding-note onboarding-assistant-note">${hi ? "चिंता न करें — Rate-GPT किसान सहायक आपको मंडी की जानकारी समझने में मदद करेगा।" : "Don’t worry — your Rate-GPT Farmer Assistant will help you make sense of mandi information."}</p>
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
