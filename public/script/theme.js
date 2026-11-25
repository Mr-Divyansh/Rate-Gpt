(() => {
  const STORAGE_KEY = "rateGptTheme";
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let transitionPending = false;

  const isTheme = (value) => value === "light" || value === "dark";
  const initialTheme = (() => {
    try {
      const savedTheme = window.localStorage.getItem(STORAGE_KEY);
      return isTheme(savedTheme) ? savedTheme : "light";
    } catch (error) {
      console.warn("Rate-GPT could not read the saved theme preference.", error);
      return "light";
    }
  })();

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (themeColor) themeColor.content = theme === "dark" ? "#090a0d" : "#f7f8f2";
    document.dispatchEvent(new CustomEvent("rategpt:themechange", { detail: { theme } }));

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn("Rate-GPT could not save the theme preference.", error);
    }
  }

  applyTheme(initialTheme);

  function getRevealOrigin(button, event) {
    const rect = button.getBoundingClientRect();
    const hasPointerPosition = event.detail > 0 && (event.clientX !== 0 || event.clientY !== 0);
    const x = hasPointerPosition ? event.clientX : rect.left + rect.width / 2;
    const y = hasPointerPosition ? event.clientY : rect.top + rect.height / 2;
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(width - x, y),
      Math.hypot(x, height - y),
      Math.hypot(width - x, height - y),
    ) + 2;

    return { x, y, radius };
  }

  function toggleTheme(button, event) {
    if (transitionPending) return;

    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    if (reducedMotion.matches) {
      applyTheme(nextTheme);
      return;
    }

    const startViewTransition = document.startViewTransition;
    if (typeof startViewTransition !== "function") {
      transitionPending = true;
      root.classList.add("theme-fallback-transition");
      applyTheme(nextTheme);
      window.setTimeout(() => {
        root.classList.remove("theme-fallback-transition");
        transitionPending = false;
      }, 240);
      return;
    }

    const { x, y, radius } = getRevealOrigin(button, event);
    root.style.setProperty("--theme-reveal-x", `${x}px`);
    root.style.setProperty("--theme-reveal-y", `${y}px`);
    root.style.setProperty("--theme-reveal-radius", `${radius}px`);
    transitionPending = true;

    try {
      const transition = startViewTransition.call(document, () => applyTheme(nextTheme));
      const clearTransition = () => {
        transitionPending = false;
        root.style.removeProperty("--theme-reveal-x");
        root.style.removeProperty("--theme-reveal-y");
        root.style.removeProperty("--theme-reveal-radius");
      };
      transition.finished.then(clearTransition, clearTransition);
    } catch (error) {
      console.error("Rate-GPT could not start the theme reveal transition.", error);
      transitionPending = false;
      root.style.removeProperty("--theme-reveal-x");
      root.style.removeProperty("--theme-reveal-y");
      root.style.removeProperty("--theme-reveal-radius");
      applyTheme(nextTheme);
    }
  }

  window.rateGptToggleTheme = toggleTheme;
})();
