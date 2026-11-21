const STORAGE_KEY = "rate-gpt:onboarding:v1";

function readChoice() {
  try { return localStorage.getItem(STORAGE_KEY); }
  catch { return null; }
}

function saveChoice(value) {
  try { localStorage.setItem(STORAGE_KEY, value); }
  catch { /* The dialog still works when storage is unavailable. */ }
}

export function showFirstVisitWelcome() {
  if (readChoice()) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("../style/onboarding.css", import.meta.url).href;
  document.head.append(link);

  const hi = document.documentElement.lang.toLowerCase().startsWith("hi");
  const dialog = document.createElement("dialog");
  dialog.className = "onboarding-dialog";
  dialog.setAttribute("aria-labelledby", "onboardingTitle");

  dialog.innerHTML = `
    <div class="onboarding-card">
      <button class="onboarding-close" type="button" aria-label="${hi ? "बंद करें" : "Close"}">×</button>
      <div class="onboarding-art-wrap">
        <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Namaste.png" alt="" width="320" height="320">
      </div>
      <div class="onboarding-copy">
        <p class="onboarding-eyebrow">${hi ? "RATE-GPT में आपका स्वागत है" : "WELCOME TO RATE-GPT"}</p>
        <h2 id="onboardingTitle">${hi ? "नमस्ते! पहली बार आए हैं?" : "Welcome! First time here?"}</h2>
        <p class="onboarding-message">${hi
          ? "बधाई हो! Rate-GPT पर आपका स्वागत है। हमारा Farmer Assistant आपको मंडी भाव देखने और वेबसाइट इस्तेमाल करने का आसान तरीका बताएगा।"
          : "Congratulations on your first visit! Your Farmer Assistant can show you how to explore mandi prices and use Rate-GPT with ease."}</p>
        <div class="onboarding-actions">
          <button class="btn btn-primary onboarding-view" type="button">${hi ? "ट्यूटोरियल देखें" : "View tutorial"}</button>
          <button class="btn onboarding-skip" type="button">${hi ? "ट्यूटोरियल छोड़ें" : "Skip tutorial"}</button>
        </div>
        <p class="onboarding-note">${hi ? "आप बाद में भी मदद ले सकते हैं।" : "You can explore Rate-GPT at your own pace."}</p>
      </div>
    </div>
  `;

  document.body.append(dialog);

  const finish = (choice) => {
    saveChoice(choice);
    if (dialog.open) dialog.close();
    dialog.remove();
  };

  dialog.querySelector(".onboarding-skip").addEventListener("click", () => finish("skipped"));
  dialog.querySelector(".onboarding-close").addEventListener("click", () => finish("skipped"));
  dialog.addEventListener("cancel", () => saveChoice("skipped"), { once: true });

  dialog.querySelector(".onboarding-view").addEventListener("click", () => {
    saveChoice("started");
    dialog.innerHTML = `
      <div class="onboarding-card onboarding-card--step">
        <button class="onboarding-close" type="button" aria-label="${hi ? "बंद करें" : "Close"}">×</button>
        <div class="onboarding-art-wrap">
          <img class="onboarding-art" src="/Images/Characte_For_RateGPT/Characte_For_RateGPT_Point.png" alt="" width="320" height="320">
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
    dialog.querySelector(".onboarding-close").addEventListener("click", () => finish("started"));
    dialog.querySelector(".onboarding-done").addEventListener("click", () => finish("started"));
    dialog.querySelector(".onboarding-explore").addEventListener("click", () => saveChoice("completed"));
    dialog.querySelector(".onboarding-close").focus();
  });

  dialog.addEventListener("click", event => {
    if (event.target === dialog) finish("skipped");
  });

  dialog.showModal();
  dialog.querySelector(".onboarding-view").focus();
}
