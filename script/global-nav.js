const navigationLinks = [
  ["Home", "index.html"],
  ["Mandi Prices", "mandi-prices.html"],
  ["Calculator", "calculator.html"],
  ["Comparison", "comparison.html"],
  ["Crops", "crops.html"],
  ["Price Trends", "price-trends.html"],
  ["Watchlist", "watchlist.html"],
  ["About", "about.html"],
  ["Dashboard", "marketDashboard.html"],
];

const currentPage = window.location.pathname.split("/").pop()?.toLowerCase() || "index.html";

function createLink(label, href, className = "") {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (className) link.className = className;
  if (href.toLowerCase() === currentPage) {
    link.classList.add("is-current");
    link.setAttribute("aria-current", "page");
  }
  return link;
}

function renderHeader(header) {
  const existingLogoUrl = header.querySelector(".brand img")?.src;
  header.className = "global-site-header";
  header.replaceChildren();

  const inner = document.createElement("div");
  inner.className = "global-header-inner";

  const brand = document.createElement("a");
  brand.className = "global-brand";
  brand.href = "index.html";
  brand.setAttribute("aria-label", "Rate-GPT home");

  const logo = document.createElement("img");
  logo.src = existingLogoUrl || "/Rate%20GPT%20Agritech%20Logo.png";
  logo.alt = "";
  logo.width = 42;
  logo.height = 42;
  brand.append(logo);

  const brandName = document.createElement("span");
  brandName.textContent = "Rate-GPT";
  const brandTagline = document.createElement("small");
  brandTagline.textContent = "MARKET INTELLIGENCE";
  brandName.append(brandTagline);
  brand.append(brandName);

  const toggle = document.createElement("button");
  toggle.className = "global-menu-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-controls", "globalNavigation");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
  for (let index = 0; index < 3; index += 1) {
    toggle.append(document.createElement("span"));
  }

  const nav = document.createElement("nav");
  nav.className = "global-navigation";
  nav.id = "globalNavigation";
  nav.setAttribute("aria-label", "Main navigation");
  for (const [label, href] of navigationLinks) {
    nav.append(createLink(label, href));
  }

  inner.append(brand, toggle, nav);
  header.append(inner);

  const closeMenu = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
  nav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (
      event.target instanceof Node &&
      !nav.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      closeMenu();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1100) closeMenu();
  });
}

function renderFooter(footer) {
  footer.className = "global-site-footer";
  footer.replaceChildren();

  const inner = document.createElement("div");
  inner.className = "global-footer-inner";
  const summary = document.createElement("div");
  summary.className = "global-footer-summary";
  const name = document.createElement("strong");
  name.textContent = "Rate-GPT";
  const description = document.createElement("p");
  description.textContent = "Government mandi records, presented clearly.";
  const source = document.createElement("a");
  source.href = "https://data.gov.in/";
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = "Data source: data.gov.in";
  summary.append(name, description, source);

  const links = document.createElement("nav");
  links.className = "global-footer-links";
  links.setAttribute("aria-label", "Footer navigation");
  for (const [label, href] of navigationLinks) {
    links.append(createLink(label, href));
  }

  const copyright = document.createElement("small");
  copyright.append("© ");
  const year = document.createElement("span");
  year.id = "year";
  year.textContent = String(new Date().getFullYear());
  copyright.append(year, " Rate-GPT");
  inner.append(summary, links, copyright);
  footer.append(inner);
}

const header = document.querySelector("header.site-header");
if (header) renderHeader(header);

let footer = document.querySelector("footer.site-footer");
if (!footer) {
  footer = document.createElement("footer");
  document.body.append(footer);
}
renderFooter(footer);
