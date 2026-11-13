const navigationLinks = [
  ["Home", "index.html"],
  ["Mandi Prices", "mandi-prices.html"],
  ["About Us", "about.html"],
];

const currentPage =
  window.location.pathname.split("/").pop()?.toLowerCase() || "index.html";

function createLink([label, href]) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (href === currentPage) {
    link.classList.add("is-current");
    link.setAttribute("aria-current", "page");
  }
  return link;
}

function renderHeader(header) {
  const logoUrl = header.querySelector(".brand img")?.src;
  header.className = "global-site-header";
  header.replaceChildren();

  const inner = document.createElement("div");
  inner.className = "global-header-inner";

  const brand = document.createElement("a");
  brand.className = "global-brand";
  brand.href = "index.html";
  brand.setAttribute("aria-label", "Rate-GPT home");

  if (logoUrl) {
    const logo = document.createElement("img");
    logo.src = logoUrl;
    logo.alt = "";
    logo.width = 42;
    logo.height = 42;
    logo.decoding = "async";
    brand.append(logo);
  }

  const brandText = document.createElement("span");
  brandText.append(document.createTextNode("Rate-GPT"));
  const tagline = document.createElement("small");
  tagline.textContent = "MARKET INTELLIGENCE";
  brandText.append(tagline);
  brand.append(brandText);

  const nav = document.createElement("nav");
  nav.className = "global-navigation";
  nav.id = "globalNavigation";
  nav.setAttribute("aria-label", "Main navigation");
  navigationLinks.forEach((item) => nav.append(createLink(item)));

  const actions = document.createElement("div");
  actions.className = "global-header-actions";
  const menu = document.createElement("button");
  menu.className = "global-menu-toggle";
  menu.type = "button";
  menu.setAttribute("aria-controls", nav.id);
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Open navigation");
  for (let index = 0; index < 3; index += 1) {
    menu.append(document.createElement("span"));
  }
  actions.append(menu);
  inner.append(brand, nav, actions);
  header.append(inner);

  const backdrop = document.createElement("button");
  backdrop.className = "global-nav-backdrop";
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Close navigation");
  backdrop.tabIndex = -1;
  document.body.append(backdrop);

  const closeMenu = (restoreFocus = false) => {
    nav.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
    document.body.classList.remove("global-menu-open");
    if (restoreFocus) menu.focus({ preventScroll: true });
  };

  const openMenu = () => {
    nav.classList.add("is-open");
    backdrop.classList.add("is-visible");
    menu.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-label", "Close navigation");
    document.body.classList.add("global-menu-open");
    nav.querySelector("a")?.focus({ preventScroll: true });
  };

  menu.addEventListener("click", () => {
    if (menu.getAttribute("aria-expanded") === "true") {
      closeMenu();
    } else {
      openMenu();
    }
  });
  backdrop.addEventListener("click", () => closeMenu(true));
  nav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      closeMenu();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (menu.getAttribute("aria-expanded") !== "true") return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key !== "Tab") return;
    const firstLink = nav.querySelector("a");
    const lastLink = nav.querySelector("a:last-of-type");
    if (
      event.shiftKey &&
      (document.activeElement === firstLink ||
        document.activeElement === menu)
    ) {
      event.preventDefault();
      (document.activeElement === menu ? lastLink : menu)?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === lastLink ||
        document.activeElement === menu)
    ) {
      event.preventDefault();
      (document.activeElement === menu ? firstLink : menu)?.focus();
    }
  });
  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 900) closeMenu();
    },
    { passive: true },
  );

  return logoUrl;
}

function renderFooter(footer, logoUrl) {
  footer.className = "global-site-footer";
  footer.replaceChildren();

  const inner = document.createElement("div");
  inner.className = "global-footer-inner";
  const main = document.createElement("div");
  main.className = "global-footer-main";

  const summary = document.createElement("section");
  summary.className = "global-footer-summary";
  const brand = document.createElement("a");
  brand.className = "global-footer-brand";
  brand.href = "index.html";
  brand.setAttribute("aria-label", "Rate-GPT home");
  if (logoUrl) {
    const logo = document.createElement("img");
    logo.src = logoUrl;
    logo.alt = "";
    logo.width = 42;
    logo.height = 42;
    logo.loading = "lazy";
    logo.decoding = "async";
    brand.append(logo);
  }
  const brandName = document.createElement("span");
  brandName.textContent = "Rate-GPT";
  brand.append(brandName);

  const description = document.createElement("p");
  description.textContent =
    "Clear access to government-reported mandi price records, helping farmers explore markets with better information.";
  const source = document.createElement("a");
  source.className = "global-footer-source";
  source.href = "https://data.gov.in/";
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = "Explore Open Government Data ↗";
  summary.append(brand, description, source);

  const explore = document.createElement("section");
  const exploreTitle = document.createElement("h2");
  exploreTitle.className = "global-footer-heading";
  exploreTitle.textContent = "Explore";
  const links = document.createElement("nav");
  links.className = "global-footer-links";
  links.setAttribute("aria-label", "Footer navigation");
  navigationLinks.forEach((item) => links.append(createLink(item)));
  explore.append(exploreTitle, links);

  const callToAction = document.createElement("section");
  callToAction.className = "global-footer-cta";
  const callToActionTitle = document.createElement("h2");
  callToActionTitle.className = "global-footer-heading";
  callToActionTitle.textContent = "Make informed market decisions";
  const callToActionText = document.createElement("p");
  callToActionText.textContent =
    "Browse available crop prices, compare reported market rates and always check the arrival date.";
  const callToActionLink = document.createElement("a");
  callToActionLink.className = "global-footer-cta-link";
  callToActionLink.href = "mandi-prices.html";
  callToActionLink.append(
    document.createTextNode("Explore mandi prices"),
    document.createTextNode(" →"),
  );
  callToAction.append(callToActionTitle, callToActionText, callToActionLink);

  main.append(summary, explore, callToAction);

  const bottom = document.createElement("div");
  bottom.className = "global-footer-bottom";
  const copyright = document.createElement("p");
  copyright.textContent =
    `© ${new Date().getFullYear()} Rate-GPT. All rights reserved.`;
  const note = document.createElement("p");
  note.textContent =
    "Market records are informational and may not reflect a current offer.";
  bottom.append(copyright, note);

  inner.append(main, bottom);
  footer.append(inner);
}

const header = document.querySelector("header.site-header");
const logoUrl = header ? renderHeader(header) : undefined;

let footer = document.querySelector("footer.site-footer");
if (!footer) {
  footer = document.createElement("footer");
  document.body.append(footer);
}
renderFooter(footer, logoUrl);
