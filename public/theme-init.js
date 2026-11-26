(function () {
  var key = "rateGptTheme";
  var saved = null;
  try {
    saved = localStorage.getItem(key);
  } catch (_) {}

  var theme = saved === "dark" || saved === "light"
    ? saved
    : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#111a16" : "#f7f7f0");
})();
