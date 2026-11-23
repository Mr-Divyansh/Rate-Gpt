import { getLang, onLangChange } from "./i18n.js";

// Keep spotlight geometry in the same viewport coordinate space as
// getBoundingClientRect() and fixed-position overlays.
export function calculateSpotlightGeometry(rect, viewportWidth, viewportHeight, inset = 10, gap = 12) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return {
    centerX,
    centerY,
    radiusX: Math.max(0, Math.min(rect.width / 2 + gap, centerX - inset, viewportWidth - centerX - inset)),
    radiusY: Math.max(0, Math.min(rect.height / 2 + gap, centerY - inset, viewportHeight - centerY - inset)),
  };
}

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
  const siteNav = document.querySelector(".site-nav");
  const openingMobileNav = window.matchMedia("(max-width: 720px)").matches &&
    !siteNav?.classList.contains("is-open");
  if (openingMobileNav) mobileToggle?.click();

  let positionFrame = 0;
  let drawerFallbackTimer = 0;

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
  action.href = "mandi-prices.html?startFinderTutorial=1";
  // Carry the guided-tour intent into the finder page; direct navigation remains unchanged.
  pricesLink.href = new URL("mandi-prices.html?startFinderTutorial=1", window.location.href).href;

  const stopGuide = ({ restoreFocus = false } = {}) => {
    guide.remove();
    pricesLink.classList.remove("is-guide-highlighted");
    pricesLink.removeAttribute("aria-describedby");
    document.removeEventListener("keydown", onEscape);
    window.removeEventListener("resize", schedulePositionGuide);
    window.removeEventListener("orientationchange", schedulePositionGuide);
    window.removeEventListener("scroll", schedulePositionGuide, true);
    window.visualViewport?.removeEventListener("resize", schedulePositionGuide);
    window.visualViewport?.removeEventListener("scroll", schedulePositionGuide);
    siteNav?.removeEventListener("transitionend", onDrawerTransitionEnd);
    window.clearTimeout(drawerFallbackTimer);
    window.cancelAnimationFrame(positionFrame);
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
    // Apply final highlight styles BEFORE measuring: mobile uses border-box
    // sizing and an arrow, so its final dimensions differ from the base link.
    pricesLink.classList.add("is-guide-highlighted");
    pricesLink.setAttribute("aria-describedby", "mandiNavGuideText");

    const rect = pricesLink.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const geometry = calculateSpotlightGeometry(rect, viewportWidth, viewportHeight);
    guide.style.setProperty("--spot-x", geometry.centerX + "px");
    guide.style.setProperty("--spot-y", geometry.centerY + "px");
    guide.style.setProperty("--spot-rx", geometry.radiusX + "px");
    guide.style.setProperty("--spot-ry", geometry.radiusY + "px");

    const compact = viewportWidth < 900;
    const mobile = viewportWidth <= 720;
    const bubbleViewportHeight = window.visualViewport?.height || window.innerHeight;
    const shortLandscape = mobile && viewportWidth > bubbleViewportHeight && bubbleViewportHeight < 500;
    guide.classList.toggle("is-landscape", shortLandscape);
    guide.classList.toggle("is-compact", compact);
    guide.classList.toggle("is-mobile", mobile);

    // Keep the mobile speech bubble compact instead of stretching it across
    // large phone screens; center it beneath the highlighted drawer item.
    const bubbleWidth = mobile
      ? Math.min(380, viewportWidth - 32)
      : Math.min(compact ? viewportWidth - 32 : 370, 370);
    const bubbleLeft = shortLandscape
      ? 16
      : mobile
        ? Math.max(16, (viewportWidth - bubbleWidth) / 2)
        : Math.max(16, Math.min(rect.left - 8, viewportWidth - bubbleWidth - 16));
    const belowNav = rect.bottom + (mobile ? 16 : 22);
    let bubbleTop = Math.min(belowNav, Math.max(76, bubbleViewportHeight - (mobile ? 300 : compact ? 300 : 280)));
    copy.style.left = bubbleLeft + "px";
    copy.style.top = bubbleTop + "px";
    copy.style.width = bubbleWidth + "px";

    // Reserve room for a compact farmer on short landscape screens.
    if (shortLandscape) {
      bubbleTop = Math.max(16, Math.min(belowNav, bubbleViewportHeight - copy.offsetHeight - 104 - 24));
      copy.style.top = bubbleTop + "px";
      farmer.style.left = Math.max(8, viewportWidth - 108) + "px";
      farmer.style.top = Math.min(bubbleTop + copy.offsetHeight + 16, bubbleViewportHeight - 104) + "px";
    } else if (mobile) {
      farmer.style.left = Math.max(12, Math.min(bubbleLeft + bubbleWidth - 126, viewportWidth - 144)) + "px";
      farmer.style.top = Math.min(bubbleTop + copy.offsetHeight + 6, bubbleViewportHeight - 148) + "px";
    } else if (compact) {
      farmer.style.left = Math.max(16, Math.min(bubbleLeft + bubbleWidth - 150, viewportWidth - 166)) + "px";
      farmer.style.top = Math.min(bubbleTop + copy.offsetHeight + 4, bubbleViewportHeight - 190) + "px";
    } else {
      farmer.style.left = Math.min(bubbleLeft + bubbleWidth - 6, viewportWidth - 250) + "px";
      farmer.style.top = Math.max(78, bubbleTop - 38) + "px";
    }
  }

  function schedulePositionGuide() {
    window.cancelAnimationFrame(positionFrame);
    positionFrame = window.requestAnimationFrame(positionGuide);
  }

  function onDrawerTransitionEnd(event) {
    if (event.target === siteNav && event.propertyName === "transform") {
      window.clearTimeout(drawerFallbackTimer);
      schedulePositionGuide();
    }
  }

  action.addEventListener("click", () => stopGuide());
  pricesLink.addEventListener("click", () => stopGuide(), { once: true });
  document.addEventListener("keydown", onEscape);
  copy.append(eyebrow, title, message, action);
  guide.append(backdrop, copy, farmer);
  document.body.append(guide);
  syncLanguage();
  window.addEventListener("resize", schedulePositionGuide);
  window.addEventListener("orientationchange", schedulePositionGuide);
  window.addEventListener("scroll", schedulePositionGuide, true);
  window.visualViewport?.addEventListener("resize", schedulePositionGuide);
  window.visualViewport?.addEventListener("scroll", schedulePositionGuide);
  if (openingMobileNav) {
    // The drawer animates from off-screen over 250ms; measure only when it
    // reaches its final transform, with a fallback for reduced-motion cases.
    siteNav?.addEventListener("transitionend", onDrawerTransitionEnd);
    drawerFallbackTimer = window.setTimeout(schedulePositionGuide, 400);
  } else {
    schedulePositionGuide();
  }
  onLangChange(syncLanguage);
  action.focus();
}
