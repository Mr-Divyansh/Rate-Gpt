const siteNavigation = [
  { label: "Home", href: "index.html", page: "index.html" },
  { label: "Mandi prices", href: "mandiPrice.html", page: "mandiPrice.html" },
  { label: "Price trends", href: "app.html#trends", page: "app.html#trends" },
  {
    label: "Market dashboard",
    href: "app.html#board",
    page: "app.html#board",
  },
  { label: "About", href: "about.html", page: "about.html" },
];

const header = document.querySelector(".site-header");
const nav = document.querySelector("#mainNav");

if (header && nav) {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const currentHash = window.location.hash;

  nav.replaceChildren(
    ...siteNavigation.map((item) => {
      const link = document.createElement("a");
      link.href = item.href;
      link.textContent = item.label;

      const isCurrent =
        item.page === currentPage ||
        (currentPage === "app.html" &&
          item.page === `app.html${currentHash || "#board"}`);

      if (isCurrent) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }

      return link;
    }),
  );

  const cta = header.querySelector(".header-cta");
  if (cta) {
    cta.href = "mandiPrice.html";
    cta.innerHTML = 'Explore prices <span aria-hidden="true">→</span>';
  }

  let toggle = header.querySelector("#navToggle, #menuToggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.id = "navToggle";
    toggle.type = "button";
    toggle.className = "nav-toggle menu-toggle";
    toggle.setAttribute("aria-controls", "mainNav");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    toggle.innerHTML = "<span></span><span></span><span></span>";
    header.insertBefore(toggle, nav);
  }

  const closeMenu = () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation",
    );
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}
