// Refresh the selected view periodically while the page is visible.
let refreshInterval = null;

function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);

  refreshInterval = setInterval(() => {
    if (
      document.visibilityState === "visible" &&
      !state.loading &&
      !state.exporting
    ) {
      loadPrices();
    }
  }, 5 * 60 * 1000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Refresh when returning to visible tab (pause while hidden, then refresh)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    startAutoRefresh();
    loadPrices(); // Fetch fresh data when user returns to tab
  } else {
    stopAutoRefresh();
  }
});

startAutoRefresh();
onLangChange(() => {