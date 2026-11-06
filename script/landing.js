const menuButton = document.querySelector("#menuToggle");
const nav = document.querySelector("#mainNav");
menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
const numberFormat = new Intl.NumberFormat("en-IN");
const dateFormat = (value) => {
  if (!value) return "Not available";
  const d = new Date(value + "T00:00:00");
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
async function loadSummary() {
  const status = document.querySelector("#sourceStatus");
  const tag = document.querySelector("#statusTag");
  try {
    const response = await fetch("/api/v1/health", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    const payload = await response.json();
    if (!payload.success || !payload.data)
      throw new Error(payload.error?.message || "Backend status unavailable");
    const stats = payload.data.stats || {};
    document.querySelector("#totalRecords").textContent = numberFormat.format(
      stats.totalRecords || 0,
    );
    document.querySelector("#totalMarkets").textContent = numberFormat.format(
      stats.mandisCovered || 0,
    );
    document.querySelector("#totalCrops").textContent = numberFormat.format(
      stats.commoditiesTracked || 0,
    );
    document.querySelector("#totalStates").textContent = numberFormat.format(
      stats.statesCovered || 0,
    );
    document.querySelector("#latestDate").textContent = dateFormat(
      stats.latestArrivalDate,
    );
    const configured = Boolean(payload.data.upstreamSource?.apiKeyConfigured);
    status.textContent = configured
      ? "Backend connected; government API credentials are configured."
      : "Backend connected; government API credentials are not configured.";
    status.previousElementSibling?.classList.add(configured ? "good" : "bad");
    tag.textContent = payload.data.status || "Connected";
    tag.classList.add("good");
    document.querySelector("#dataDisclaimer").textContent = stats.lastSync
      ?.completed_at
      ? `Last sync attempt completed ${new Date(stats.lastSync.completed_at).toLocaleString("en-IN")}. This is not a guarantee of real-time data.`
      : "No completed sync timestamp is available in the backend status.";
  } catch (error) {
    status.textContent =
      "Could not connect to the Rate-GPT backend. Summary data is unavailable.";
    status.previousElementSibling?.classList.add("bad");
    tag.textContent = "Unavailable";
    tag.classList.add("bad");
    document.querySelector("#dataDisclaimer").textContent =
      "No sample values are substituted when the backend is unavailable.";
  }
}
loadSummary();
