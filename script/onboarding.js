export function showFirstVisitWelcome() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("../style/onboarding.css", import.meta.url).href;
  document.head.append(link);

  const hi = document.documentElement.lang.toLowerCase().startsWith("hi");
  const dialog = document.createElement("dialog");
  dialog.className = "onboarding-dialog";
  dialog.setAttribute("aria-labelledby", "onboardingTitle");

  // This is the farmer-benefits introduction shown before any detailed tour.
  // Keep the copy focused on real farmer decisions Rate-GPT can support:
  // comparing available mandi prices, finding alternatives, and reading price data.
  const showThankYou = () => {
    dialog.innerHTML = `
      <div class="onboarding-card onboarding-card--thanks onboarding-card--benefits">
        <div class="onboarding-art-wrap">
          <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Thinking.png" alt="${hi ? "सोचता हुआ किसान" : "Farmer thinking about crop prices"}" width="320" height="320" loading="lazy" fetchpriority="high" decoding="async">
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
        </div>
      </div>
    `;
    // Both the Skip and View paths lead to this short benefits introduction.
    // Continue advances to the second and final onboarding screen.
    dialog.querySelector(".onboarding-continue").addEventListener("click", showSolution);
    dialog.querySelector(".onboarding-continue").focus();
  };

  // The second screen tells the farmer, in a simple first-person story,
  // how Rate-GPT helps them compare available market information.
  // Keep this as a single-screen experience: no internal scrolling.
  const showSolution = () => {
    dialog.innerHTML = `
      <div class="onboarding-card onboarding-card--solution">
        <div class="onboarding-art-wrap onboarding-art-wrap--click">
          <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Point.png" alt="${hi ? "मंडी भाव देखने का रास्ता दिखाता किसान" : "Farmer pointing visitors towards mandi prices"}" width="320" height="320" fetchpriority="high" decoding="async">
          <a class="onboarding-farmer-cta" href="mandi-prices.html">
            <span>${hi ? "मंडी भाव देखने के लिए" : "Want to explore mandi prices?"}</span>
            <strong>${hi ? "यहाँ क्लिक करें" : "CLICK HERE"} <span aria-hidden="true">→</span></strong>
          </a>
        </div>
        <div class="onboarding-copy">
          <div class="onboarding-progress" role="group" aria-label="${hi ? "परिचय की प्रगति" : "Introduction progress"}">
            <div class="onboarding-progress-meta">
              <span>${hi ? "आपकी Rate-GPT यात्रा" : "YOUR RATE-GPT JOURNEY"}</span>
              <span>02 / 02</span>
            </div>
            <div class="onboarding-progress-track onboarding-progress-track--complete" role="progressbar" aria-label="${hi ? "परिचय की प्रगति" : "Introduction progress"}" aria-valuemin="0" aria-valuemax="2" aria-valuenow="2">
              <span></span>
            </div>
          </div>
          <p class="onboarding-eyebrow">${hi ? "अब मंडी की जानकारी हुई आसान" : "HERE'S HOW RATE-GPT HELPS"}</p>
          <h2 id="onboardingTitle">${hi ? "Rate-GPT से मुझे सही जानकारी मिलने लगी" : "Rate-GPT helped me make sense of mandi prices"}</h2>
          <p class="onboarding-message">${hi
            ? "फिर मैंने Rate-GPT इस्तेमाल किया। अब मुझे अलग-अलग मंडियों के उपलब्ध भाव एक जगह देखने और उनकी तुलना करने में मदद मिलती है।"
            : "Then I tried Rate-GPT. It helped me explore available prices across different mandis, compare my options and understand the market before deciding where to sell."}</p>
          <ul class="onboarding-benefits onboarding-solution-points">
            <li>${hi ? "अब मैं अपनी फसल के भाव कई मंडियों में देख सकता हूँ।" : "I can check how the price of my crop differs across available mandis."}</li>
            <li>${hi ? "अब मुझे अपनी स्थानीय मंडी के अलावा दूसरी मंडियों के विकल्प भी पता चलते हैं।" : "I can look beyond my usual mandi and discover other reported market options."}</li>
            <li>${hi ? "न्यूनतम, अधिकतम, मॉडल भाव और आवक देखकर मैं बेहतर जानकारी के साथ फैसला कर सकता हूँ।" : "I can use minimum, maximum, modal prices and arrivals to make a more informed selling decision."}</li>
          </ul>
          <p class="onboarding-note onboarding-assistant-note">${hi ? "Rate-GPT आपको जानकारी देता है — फैसला आप अपनी जरूरत और बाजार की स्थिति देखकर लें।" : "Rate-GPT gives you useful information. You stay in control of your selling decision."}</p>
        </div>
      </div>
    `;
    dialog.querySelector(".onboarding-farmer-cta").focus();
  };

  dialog.innerHTML = `
    <div class="onboarding-card">
      <div class="onboarding-art-wrap">
        <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Namaste.png" alt="" width="320" height="320" loading="lazy" fetchpriority="low" decoding="async">
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
  // The welcome/benefits introduction is not the interactive website tutorial.
  // Keep it free of a close control; Escape must not dismiss it unexpectedly.
  dialog.addEventListener("cancel", event => event.preventDefault());

  // The old "Let's explore mandi prices" Step 1 screen is intentionally
  // removed from the active flow for now. The detailed navigation tutorial
  // can be brought back as a later step after this benefits introduction.
  dialog.querySelector(".onboarding-view").addEventListener("click", showThankYou);

  dialog.showModal();
  dialog.querySelector(".onboarding-view").focus();
}
