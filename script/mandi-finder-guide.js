import { getLang, onLangChange } from "./i18n.js";

const TOUR_PARAM = "startFinderTutorial";
const TARGET_CLASS = "is-finder-tour-target";

function isHindi() {
  return getLang() === "hi";
}

function waitForFinder() {
  return new Promise((resolve) => {
    const stateSelect = document.getElementById("stateSelect");
    if (stateSelect && stateSelect.options.length > 1 && !stateSelect.disabled) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (stateSelect && stateSelect.options.length > 1 && !stateSelect.disabled) {
        observer.disconnect();
        resolve();
      }
    });
    if (stateSelect) observer.observe(stateSelect, { childList: true, attributes: true });
    window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 5000);
  });
}

function startFinderTour() {
  const stateSelect = document.getElementById("stateSelect");
  const districtSelect = document.getElementById("districtSelect");
  const mandiGrid = document.getElementById("mandiGrid");
  const results = document.querySelector(".results");
  const pricesHeading = document.getElementById("pricesHeading");
  if (!stateSelect || !districtSelect || !mandiGrid || !results || !pricesHeading) return;

  let step = 1;
  let activeTarget = null;
  let destroyed = false;
  let frame = 0;
  let panelTop = 0;
  let panelLeft = 0;
  let langUnsubscribe = null;

  const root = document.createElement("div");
  root.className = "mandi-finder-tour";
  root.setAttribute("role", "presentation");

  const backdrop = document.createElement("div");
  backdrop.className = "mandi-finder-tour__backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  const panel = document.createElement("section");
  panel.className = "mandi-finder-tour__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "finderTourTitle");
  panel.setAttribute("aria-describedby", "finderTourMessage");

  const progress = document.createElement("div");
  progress.className = "mandi-finder-tour__progress";
  const progressLabel = document.createElement("span");
  const progressCount = document.createElement("span");
  progress.append(progressLabel, progressCount);

  const title = document.createElement("h2");
  title.id = "finderTourTitle";
  title.className = "mandi-finder-tour__title";

  const message = document.createElement("p");
  message.id = "finderTourMessage";
  message.className = "mandi-finder-tour__message";

  const hint = document.createElement("p");
  hint.className = "mandi-finder-tour__hint";

  const action = document.createElement("button");
  action.type = "button";
  action.className = "mandi-finder-tour__continue";

  const farmer = document.createElement("img");
  farmer.className = "mandi-finder-tour__farmer";
  farmer.alt = "";
  farmer.width = 260;
  farmer.height = 280;
  farmer.decoding = "async";
  farmer.fetchPriority = "high";

  const stop = () => {
    if (destroyed) return;
    destroyed = true;
    root.remove();
    activeTarget?.classList.remove(TARGET_CLASS);
    document.body.classList.remove("has-mandi-finder-tour");
    document.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("resize", schedulePosition);
    window.removeEventListener("scroll", schedulePosition, true);
    window.visualViewport?.removeEventListener("resize", schedulePosition);
    window.visualViewport?.removeEventListener("scroll", schedulePosition);
    stateSelect.removeEventListener("change", updateActionState);
    districtSelect.removeEventListener("change", updateActionState);
    mandiGrid.removeEventListener("click", updateActionState);
    stateObserver.disconnect();
    districtObserver.disconnect();
    mandiObserver.disconnect();
    window.cancelAnimationFrame(frame);
    langUnsubscribe?.();
    pricesHeading.focus({ preventScroll: true });
  };

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (step === 5) stop();
    }
    if (event.key === "Tab") {
      const targetControl = activeTarget;
      const focusable = [targetControl, ...panel.querySelectorAll("button:not(:disabled)")]
        .filter((element) => element && element.tabIndex >= 0 && !element.hidden);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
  }

  function targetForStep() {
    if (step === 1) return stateSelect;
    if (step === 2) return districtSelect;
    if (step === 3) return mandiGrid.querySelector(".chip") || document.getElementById("mandiHelp");
    if (step === 4) return results;
    return null;
  }

  function centerTarget(target) {
    if (!target || !target.isConnected) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    target.scrollIntoView({ behavior, block: "center", inline: "nearest" });
  }

  function textForStep() {
    const hi = isHindi();
    const copy = {
      1: hi
        ? ["अपना राज्य चुनें", "सबसे पहले State dropdown खोलें और वह राज्य चुनें जहाँ की मंडी के भाव देखना चाहते हैं।", "राज्य चुनने के बाद उसके जिले लोड होंगे।"]
        : ["Choose your state", "Start by opening the State dropdown and selecting the state whose mandi prices you want to explore.", "Districts will load automatically after you choose a state."],
      2: hi
        ? ["अब अपना जिला चुनें", "District dropdown में अपना जिला चुनें। इसके बाद उस जिले की उपलब्ध मंडियाँ नीचे दिखाई देंगी।", "जिला चुनने के बाद मंडियों की सूची तैयार होगी।"]
        : ["Select your district", "Choose a district from the District dropdown. Rate-GPT will then show the mandis available for that district below.", "The mandi list appears after your district is selected."],
      3: hi
        ? ["अपनी मंडी चुनें", "नीचे दिखाई गई मंडियों में से किसी एक पर टैप करें। चुनी हुई मंडी के सरकारी भाव लोड होने लगेंगे।", "मंडी चुनने के बाद Continue दबाएँ।"]
        : ["Pick a mandi", "Tap one of the mandi options shown here. Rate-GPT will start loading the government-reported prices for your selected market.", "Select a mandi, then press Continue."],
      4: hi
        ? ["आपके मंडी भाव यहाँ हैं", "यहाँ फसल के न्यूनतम, अधिकतम और मॉडल भाव, आवक और रिकॉर्ड की तारीख देख सकते हैं। नीचे स्क्रॉल करके पूरी सूची देखें।", "फसल खोजें, भाव compare करें और हर रिकॉर्ड की तारीख व unit जरूर देखें।"]
        : ["Your mandi prices are here", "This is where you can explore minimum, maximum and modal prices, arrivals and record dates. Scroll down to browse the full list.", "Search for a crop, compare rates, and always check each record's date and unit."],
    };
    return copy[step];
  }

  function updateActionState() {
    if (step === 1) {
      action.disabled = !stateSelect.value || districtSelect.disabled;
    } else if (step === 2) {
      const help = document.getElementById("mandiHelp")?.textContent || "";
      const loading = /loading|लोड/i.test(help);
      const lookupFailed = districtSelect.disabled && Boolean(help) && !loading;
      action.disabled = loading || (!districtSelect.value && !lookupFailed);
    } else if (step === 3) {
      const selected = mandiGrid.querySelector(".chip[aria-pressed='true']");
      const hasOptions = Boolean(mandiGrid.querySelector(".chip"));
      action.disabled = hasOptions && !selected;
      const nextTarget = selected || mandiGrid.querySelector(".chip") || document.getElementById("mandiHelp");
      if (nextTarget && activeTarget !== nextTarget) {
        activeTarget?.classList.remove(TARGET_CLASS);
        activeTarget = nextTarget;
        activeTarget.classList.add(TARGET_CLASS);
        if (selected) activeTarget.focus({ preventScroll: true });
        centerTarget(activeTarget);
        schedulePosition();
      }
    } else {
      action.disabled = false;
    }
  }

  function renderPanel() {
    const hi = isHindi();
    const copy = textForStep();
    progressLabel.textContent = hi ? "आपका मंडी गाइड" : "YOUR MANDI GUIDE";
    progressCount.textContent = step + " / 4";
    title.textContent = copy[0];
    message.textContent = copy[1];
    hint.textContent = copy[2];
    action.textContent = step === 4 ? (hi ? "टूर पूरा करें" : "Finish tour") : (hi ? "Continue" : "Continue");
    action.hidden = step === 5;
    progress.hidden = step === 5;
    hint.hidden = step === 5;
    farmer.src = step === 5
      ? new URL("../Images/Characte_For_RateGPT/Characte_For_RateGPT_Namaste.png", import.meta.url).href
      : new URL("../Images/Characte_For_RateGPT/Characte_For_RateGPT_Point.png", import.meta.url).href;
    farmer.classList.toggle("is-thanks", step === 5);
    panel.classList.toggle("is-thanks", step === 5);
    updateActionState();
    schedulePosition();
  }

  function setStep(nextStep) {
    activeTarget?.classList.remove(TARGET_CLASS);
    step = nextStep;
    if (step === 5) {
      activeTarget = null;
      progressCount.textContent = "";
      title.textContent = isHindi() ? "अब मंडी भाव देखना शुरू करें!" : "You’re all set!";
      message.textContent = isHindi()
        ? "ट्यूटोरियल पूरा करने के लिए धन्यवाद! अब फसल खोजें, मंडी के भाव की तुलना करें और सही जानकारी के साथ फैसला लें। मदद चाहिए? आपका Farmer Assistant यहीं है।"
        : "Thanks for completing the tour! Search crops, compare mandi prices and make informed decisions. Need a hand? Your Farmer Assistant is right here.";
      hint.textContent = "";
      action.hidden = true;
      progress.hidden = true;
      panel.classList.add("is-thanks");
      farmer.src = new URL("../Images/Characte_For_RateGPT/Characte_For_RateGPT_Namaste.png", import.meta.url).href;
      farmer.classList.add("is-thanks");
      const close = document.createElement("button");
      close.type = "button";
      close.className = "mandi-finder-tour__close";
      close.setAttribute("aria-label", isHindi() ? "ट्यूटोरियल बंद करें" : "Close tutorial");
      close.textContent = "×";
      close.addEventListener("click", stop, { once: true });
      panel.append(close);
      updateActionState();
      schedulePosition();
      close.focus();
      return;
    }

    activeTarget = targetForStep();
    activeTarget?.classList.add(TARGET_CLASS);
    renderPanel();
    centerTarget(activeTarget);
    schedulePosition();
    if (step === 1 || step === 2) activeTarget?.focus({ preventScroll: true });
    else if (step === 3) (activeTarget || mandiGrid.querySelector(".chip"))?.focus({ preventScroll: true });
    else action.focus({ preventScroll: true });
  }

  function advance() {
    if (action.disabled) return;
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
      return;
    }
    setStep(step + 1);
  }

  function position() {
    if (destroyed) return;
    if (step === 5) {
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const farmerSize = viewportWidth <= 600 ? 132 : 164;
      const farmerHeight = farmerSize;
      const gap = viewportWidth <= 600 ? 10 : 14;
      root.style.setProperty("--tour-x", "50%");
      root.style.setProperty("--tour-y", "50%");
      root.style.setProperty("--tour-rx", "0px");
      root.style.setProperty("--tour-ry", "0px");
      farmer.style.width = farmerSize + "px";
      farmer.style.height = farmerHeight + "px";
      farmer.style.left = "50%";
      farmer.style.top = "0px";
      farmer.style.bottom = "auto";
      farmer.style.transform = "translateX(-50%)";
      panel.style.width = Math.min(430, viewportWidth - 28) + "px";
      panel.style.left = "50%";
      panel.style.transform = "translateX(-50%)";
      panel.style.maxHeight = Math.max(150, viewportHeight - farmerHeight - gap - 24) + "px";
      const panelHeight = panel.offsetHeight;
      const stackHeight = farmerHeight + gap + panelHeight;
      const stackTop = Math.max(8, (viewportHeight - stackHeight) / 2);
      farmer.style.top = stackTop + "px";
      panel.style.top = (stackTop + farmerHeight + gap) + "px";
      return;
    }

    const target = activeTarget || targetForStep();
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const rx = Math.min(rect.width / 2 + 18, rect.left + rect.width / 2 - 10, vw - rect.left - rect.width / 2 - 10);
    const ry = Math.min(rect.height / 2 + 18, rect.top + rect.height / 2 - 10, vh - rect.top - rect.height / 2 - 10);
    root.style.setProperty("--tour-x", (rect.left + rect.width / 2) + "px");
    root.style.setProperty("--tour-y", (rect.top + rect.height / 2) + "px");
    root.style.setProperty("--tour-rx", Math.max(0, rx) + "px");
    root.style.setProperty("--tour-ry", Math.max(0, ry) + "px");

    panel.style.transform = "none";
    const panelWidth = Math.min(390, vw - 32);
    panel.style.width = panelWidth + "px";
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - panelWidth / 2, vw - panelWidth - 16));
    panelLeft = left;
    panel.style.left = left + "px";
    const estimatedHeight = panel.offsetHeight || 230;
    const below = rect.bottom + 22;
    const above = rect.top - estimatedHeight - 22;
    panelTop = below + estimatedHeight < vh - 18 ? below : Math.max(16, above);
    panel.style.top = panelTop + "px";

    const farmerWidth = vw <= 600 ? 106 : 142;
    farmer.style.width = farmerWidth + "px";
    farmer.style.height = (farmerWidth * 1.08) + "px";
    farmer.style.left = Math.max(8, Math.min(left + panelWidth - farmerWidth + 8, vw - farmerWidth - 8)) + "px";
    farmer.style.top = Math.min(panelTop + estimatedHeight - 26, vh - farmerWidth * 1.08 - 8) + "px";
    farmer.style.bottom = "auto";
    farmer.style.transform = "none";
  }

  function schedulePosition() {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(position);
  }

  action.addEventListener("click", advance);
  stateSelect.addEventListener("change", updateActionState);
  districtSelect.addEventListener("change", updateActionState);
  mandiGrid.addEventListener("click", updateActionState);
  const stateObserver = new MutationObserver(updateActionState);
  const districtObserver = new MutationObserver(updateActionState);
  const mandiObserver = new MutationObserver(() => {
    updateActionState();
    if (step === 3) schedulePosition();
  });
  stateObserver.observe(stateSelect, { attributes: true, childList: true });
  districtObserver.observe(districtSelect, { attributes: true, childList: true });
  mandiObserver.observe(mandiGrid, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });

  window.addEventListener("resize", schedulePosition);
  window.addEventListener("scroll", schedulePosition, true);
  window.visualViewport?.addEventListener("resize", schedulePosition);
  window.visualViewport?.addEventListener("scroll", schedulePosition);
  document.addEventListener("keydown", onKeydown, true);

  panel.append(progress, title, message, hint, action);
  root.append(backdrop, panel, farmer);
  document.body.append(root);
  document.body.classList.add("has-mandi-finder-tour");

  langUnsubscribe = onLangChange(() => {
    if (step < 5) renderPanel();
    else {
      title.textContent = isHindi() ? "अब मंडी भाव देखना शुरू करें!" : "You’re all set!";
      message.textContent = isHindi()
        ? "ट्यूटोरियल पूरा करने के लिए धन्यवाद! अब फसल खोजें, मंडी के भाव की तुलना करें और सही जानकारी के साथ फैसला लें। मदद चाहिए? आपका Farmer Assistant यहीं है।"
        : "Thanks for completing the tour! Search crops, compare mandi prices and make informed decisions. Need a hand? Your Farmer Assistant is right here.";
    }
  });

  renderPanel();
  activeTarget = targetForStep();
  activeTarget?.classList.add(TARGET_CLASS);
  centerTarget(activeTarget);
  schedulePosition();
  activeTarget?.focus?.({ preventScroll: true });
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  let sessionHandoff = false;
  try {
    sessionHandoff = window.sessionStorage.getItem("rateGptStartFinderTutorial") === "1";
    if (sessionHandoff) window.sessionStorage.removeItem("rateGptStartFinderTutorial");
  } catch {
    // Continue with the explicit URL parameter when session storage is unavailable.
  }

  if (params.get(TOUR_PARAM) !== "1" && !sessionHandoff) return;

  params.delete(TOUR_PARAM);
  const cleanUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
  window.history.replaceState(window.history.state, "", cleanUrl);

  await waitForFinder();
  startFinderTour();
}

init();
