import { t, getLocale, onLangChange } from "./i18n.js";

const root = document.querySelector("[data-contributions]");
if (root) {
  const status = root.querySelector("[data-contributions-status]");
  const grid = root.querySelector("[data-contributions-grid]");
  const comparison = root.querySelector("[data-contribution-comparison]");
  const updated = root.querySelector("[data-contributions-updated]");
  const refresh = root.querySelector("[data-contributions-refresh]");
  const people = ["Mr-Divyansh", "AbhayWebWorld"];
  const number = (value) => new Intl.NumberFormat(getLocale()).format(Number(value) || 0);
  let latestData = null;

  function showStatus(message, isError = false) {
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function render(data) {
    latestData = data;
    status.hidden = true;
    grid.hidden = false;
    comparison.hidden = false;
    const byLogin = new Map(data.contributors.map((person) => [person.login, person]));
    for (const login of people) {
      const person = byLogin.get(login);
      const card = grid.querySelector(`[data-person="${login}"]`);
      if (!person || !card) continue;
      card.querySelector('[data-metric="commits"]').textContent = number(person.commits);
      for (const [metric, value] of Object.entries({
        pullRequests: person.pullRequests,
        comments: person.comments,
        additions: person.additions,
        deletions: person.deletions,
      })) {
        card.dataset[metric] = String(value);
      }
    }
    const metrics = [
      ["commits", "commits"],
      ["pullRequests", "pullRequests"],
      ["comments", "comments"],
      ["additions", "additions"],
      ["deletions", "deletions"],
    ];
    for (const [key, property] of metrics) {
      const row = comparison.querySelector(`[data-compare="${key}"]`);
      if (!row) continue;
      const values = people.map((login) => Number(byLogin.get(login)?.[property]) || 0);
      const max = Math.max(...values, 1);
      const bars = row.querySelectorAll(".comparison-track i");
      bars[0].style.width = `${(values[0] / max) * 100}%`;
      bars[1].style.width = `${(values[1] / max) * 100}%`;
      row.querySelector(".comparison-label b").textContent = `Divyansh ${number(values[0])} · Abhay ${number(values[1])}`;
      row.setAttribute("aria-label", `${t(`about.contributions.${key}`)}: Divyansh ${values[0]}, Abhay ${values[1]}`);
    }
    updated.textContent = t("about.contributions.updated", {
      time: new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.updatedAt)),
    });
  }

  async function load(force = false) {
    refresh.disabled = true;
    refresh.classList.add("is-loading");
    showStatus(t("about.contributions.loading"));
    try {
      const response = await fetch("/api/v1/github/contributions", {
        headers: { Accept: "application/json" },
        cache: force ? "no-store" : "default",
      });
      const payload = await response.json();
      if (!response.ok || payload?.success !== true || !Array.isArray(payload?.data?.contributors)) {
        throw new Error(payload?.error?.message || "Request failed");
      }
      render(payload.data);
    } catch {
      if (latestData) {
        render(latestData);
        showStatus(t("about.contributions.error"), true);
      } else {
        showStatus(t("about.contributions.error"), true);
      }
    } finally {
      refresh.disabled = false;
      refresh.classList.remove("is-loading");
    }
  }

  refresh?.addEventListener("click", () => load(true));
  onLangChange(() => {
    if (latestData) render(latestData);
    else showStatus(t("about.contributions.loading"));
  });
  load();
}
