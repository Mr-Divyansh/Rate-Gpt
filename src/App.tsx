/**
 * Rate GPT — Main Application Container
 *
 * Complies with strict dual-theme design specification:
 * - Light mode: #FFFFFF background, #000000 text
 * - Dark mode: #111111 background, #FFFFFF text
 * - Zero extra decorative fluff, clean accessible focus states
 */

import React, {
  useState,
  useEffect,
  useCallback,
  lazy,
  Suspense,
  useRef,
} from "react";
import { Header } from "./components/Header.js";
import { FilterSection } from "./components/FilterSection.js";
import { PriceTable } from "./components/PriceTable.js";
import { Footer } from "./components/Footer.js";
import { api } from "./services/apiClient.js";
import { HealthResponse, MandiRecord, PaginationMeta } from "./types/mandi.js";
import { PriceUnit } from "./utils/priceUnit.js";
import { useLanguage } from "./context/LanguageContext.js";
import { useWatchlist } from "./hooks/useWatchlist.js";
import {
  AlertCircle,
  RefreshCw,
  Layers,
  TrendingUp,
  Database,
  ArrowRight,
} from "lucide-react";

type AppTab =
  "board" | "compare" | "trends" | "sync" | "calculator" | "watchlist";

function readCurrentTab(): AppTab {
  if (typeof window === "undefined") return "board";

  const tab = window.location.hash.slice(1);
  switch (tab) {
    case "compare":
    case "trends":
    case "sync":
    case "calculator":
    case "watchlist":
      return tab;
    default:
      return "board";
  }
}

const MarketComparison = lazy(() =>
  import("./components/MarketComparison.js").then((m) => ({
    default: m.MarketComparison,
  })),
);
const PriceTrendView = lazy(() =>
  import("./components/PriceTrendView.js").then((m) => ({
    default: m.PriceTrendView,
  })),
);
const PriceCalculator = lazy(() =>
  import("./components/PriceCalculator.js").then((m) => ({
    default: m.PriceCalculator,
  })),
);
const SyncStatusView = lazy(() =>
  import("./components/SyncStatusView.js").then((m) => ({
    default: m.SyncStatusView,
  })),
);
const Watchlist = lazy(() =>
  import("./components/Watchlist.js").then((m) => ({ default: m.Watchlist })),
);

function readUrlFilters() {
  if (typeof window === "undefined") {
    return {
      state: "",
      district: "",
      market: "",
      search: "",
      sort: "date_desc",
      unit: "quintal" as PriceUnit,
    };
  }
  const p = new URLSearchParams(window.location.search);
  const unit = p.get("unit") === "kg" ? "kg" : "quintal";
  return {
    state: p.get("state") || "",
    district: p.get("district") || "",
    market: p.get("market") || "",
    search: p.get("search") || "",
    sort: p.get("sort") || "date_desc",
    unit: unit as PriceUnit,
  };
}

function buildQuery(params: {
  state: string;
  district: string;
  market: string;
  search: string;
  sort: string;
  unit: string;
  offset: number;
}) {
  const sp = new URLSearchParams();
  if (params.state) sp.set("state", params.state);
  if (params.district) sp.set("district", params.district);
  if (params.market) sp.set("market", params.market);
  if (params.search) sp.set("search", params.search);
  if (params.sort && params.sort !== "date_desc") sp.set("sort", params.sort);
  if (params.unit && params.unit !== "quintal") sp.set("unit", params.unit);
  if (params.offset && params.offset > 0)
    sp.set("offset", String(params.offset));
  return sp.toString();
}

export default function App() {
  // Theme state with localStorage persistence
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rategpt_theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("rategpt_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("rategpt_theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const initialFilters = readUrlFilters();

  // Price display unit (source data is per quintal)
  const [priceUnit, setPriceUnit] = useState<PriceUnit>(initialFilters.unit);

  // Tab navigation
  const [currentTab, setCurrentTab] = useState<AppTab>(readCurrentTab);

  const changeTab = useCallback((tab: AppTab) => {
    setCurrentTab(tab);
    const hash = tab === "board" ? "" : `#${tab}`;
    const destination = `${window.location.pathname}${window.location.search}${hash}`;
    if (
      `${window.location.pathname}${window.location.search}${window.location.hash}` !==
      destination
    ) {
      window.history.pushState(null, "", destination);
    }
  }, []);

  // Comparison & Trend targeted commodity/market
  const [compareCommodity, setCompareCommodity] = useState<string>("");
  const [trendTarget, setTrendTarget] = useState({
    commodity: "",
    market: "",
    state: "",
    district: "",
  });

  // System & Health stats
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const watchlist = useWatchlist();
  const { t } = useLanguage();

  const fetchHealthStats = useCallback(() => {
    api.getHealth().then(setHealth).catch(console.error);
  }, []);

  useEffect(() => {
    fetchHealthStats();
  }, [fetchHealthStats]);

  // Filters State for Mandi Price Board
  const [selectedState, setSelectedState] = useState(initialFilters.state);
  const [selectedDistrict, setSelectedDistrict] = useState(
    initialFilters.district,
  );
  const [selectedMarket, setSelectedMarket] = useState(initialFilters.market);
  const [searchQuery, setSearchQuery] = useState(initialFilters.search);
  const [selectedSort, setSelectedSort] = useState(initialFilters.sort);
  const [offset, setOffset] = useState(() => {
    const p = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const o = parseInt(p.get("offset") || "0", 10);
    return Number.isFinite(o) && o >= 0 ? o : 0;
  });

  // Price Records & Pagination
  const [records, setRecords] = useState<MandiRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    limit: 50,
    offset: 0,
    total: 0,
    hasNext: false,
  });
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastCoarseKeyRef = useRef(
    `${initialFilters.state}|${initialFilters.district}|${initialFilters.market}|${initialFilters.sort}|${initialFilters.unit}`,
  );

  // Sync filter state to URL (coarse changes push a history entry)
  useEffect(() => {
    const coarseKey = `${selectedState}|${selectedDistrict}|${selectedMarket}|${selectedSort}|${priceUnit}`;
    if (coarseKey === lastCoarseKeyRef.current) return;
    const desired = buildQuery({
      state: selectedState,
      district: selectedDistrict,
      market: selectedMarket,
      search: searchQuery,
      sort: selectedSort,
      unit: priceUnit,
      offset,
    });
    const query = desired ? `?${desired}` : "";
    if (window.location.search !== query) {
      window.history.pushState(
        null,
        "",
        `${window.location.pathname}${query}${window.location.hash}`,
      );
    }
    lastCoarseKeyRef.current = coarseKey;
  }, [
    selectedState,
    selectedDistrict,
    selectedMarket,
    selectedSort,
    priceUnit,
  ]);

  // Keep URL in sync for fine-grained changes (search/offset) via replaceState
  useEffect(() => {
    const desired = buildQuery({
      state: selectedState,
      district: selectedDistrict,
      market: selectedMarket,
      search: searchQuery,
      sort: selectedSort,
      unit: priceUnit,
      offset,
    });
    const query = desired ? `?${desired}` : "";
    if (window.location.search === query) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query}${window.location.hash}`,
    );
  }, [
    searchQuery,
    offset,
    selectedState,
    selectedDistrict,
    selectedMarket,
    selectedSort,
    priceUnit,
  ]);

  // Restore state from URL on browser back/forward
  useEffect(() => {
    const onPop = () => {
      const f = readUrlFilters();
      const p = new URLSearchParams(window.location.search);
      const o = parseInt(p.get("offset") || "0", 10);
      lastCoarseKeyRef.current = `${f.state}|${f.district}|${f.market}|${f.sort}|${f.unit}`;
      setSelectedState(f.state);
      setSelectedDistrict(f.district);
      setSelectedMarket(f.market);
      setSearchQuery(f.search);
      setSelectedSort(f.sort);
      setPriceUnit(f.unit);
      setOffset(Number.isFinite(o) && o >= 0 ? o : 0);
      setCurrentTab(readCurrentTab());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Load Mandi Prices when filters change
  const loadPrices = useCallback(() => {
    setLoadingPrices(true);
    setError(null);

    const controller = new AbortController();
    api
      .getPrices(
        {
          state: selectedState || undefined,
          district: selectedDistrict || undefined,
          market: selectedMarket || undefined,
          search: searchQuery || undefined,
          sort: selectedSort,
          limit: 50,
          offset,
        },
        controller.signal,
      )
      .then((res) => {
        setRecords(res.records);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[Error fetching prices]", err);
          setError(
            "The market dashboard is in preview. Prices and filters will be available when the data service is connected. No sample prices are shown.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPrices(false);
      });

    return () => controller.abort();
  }, [
    selectedState,
    selectedDistrict,
    selectedMarket,
    searchQuery,
    selectedSort,
    offset,
  ]);

  useEffect(() => {
    // Return the cleanup so outdated requests are aborted when filters change
    // or the component unmounts. This prevents stale results winning the race.
    return loadPrices();
  }, [loadPrices]);

  // Reset pagination offset whenever search, filters, or sort change
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedDistrict("");
    setSelectedMarket("");
    setOffset(0);
  };
  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    setSelectedMarket("");
    setOffset(0);
  };
  const handleMarketChange = (market: string) => {
    setSelectedMarket(market);
    setOffset(0);
  };
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setOffset(0);
  };
  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
    setOffset(0);
  };

  const handleClearFilters = () => {
    setSelectedState("");
    setSelectedDistrict("");
    setSelectedMarket("");
    setSearchQuery("");
    setSelectedSort("date_desc");
    setOffset(0);
  };

  const hasActiveFilters = Boolean(
    selectedState ||
    selectedDistrict ||
    selectedMarket ||
    searchQuery ||
    selectedSort !== "date_desc",
  );

  // Actions from table rows
  const handleSelectCompare = (commodity: string) => {
    setCompareCommodity(commodity);
    changeTab("compare");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectTrend = (
    commodity: string,
    market: string,
    state: string,
    district: string,
  ) => {
    setTrendTarget({ commodity, market, state, district });
    changeTab("trends");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Quick header sync trigger
  const handleHeaderSync = async () => {
    setIsSyncing(true);
    try {
      await api.triggerSync({});
      fetchHealthStats();
      loadPrices();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={changeTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        totalRecords={health?.stats.totalRecords ?? meta.total}
        lastSyncDate={health?.stats.latestArrivalDate ?? null}
        onTriggerSyncClick={handleHeaderSync}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error notification banner */}
        {error && (
          <div className="mb-6 p-4 border border-rose-600/40 bg-rose-500/10 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-[var(--text-primary)]">{error}</span>
            </div>
            <button
              onClick={loadPrices}
              className="px-2.5 py-1 border border-[var(--border-color)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab 1: Mandi Price Board */}
        {currentTab === "board" && (
          <div>
            {/* Quick Hero Banner with KPI Badges */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Mandi Price Discovery Board
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                  Stored agricultural market records reported by agricultural
                  produce market committees (APMC / Mandis). Freshness depends
                  on the latest successful data sync.
                </p>
              </div>

              {/* Stats Counters */}
              <div className="flex items-center space-x-4 text-xs font-mono border-t md:border-t-0 pt-3 md:pt-0 border-[var(--border-color)]">
                <div>
                  <div className="text-[10px] uppercase text-[var(--text-secondary)]">
                    Mandis
                  </div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">
                    {health?.stats.mandisCovered ?? "—"}
                  </div>
                </div>
                <div className="border-l border-[var(--border-color)] pl-4">
                  <div className="text-[10px] uppercase text-[var(--text-secondary)]">
                    Crops
                  </div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">
                    {health?.stats.commoditiesTracked ?? "—"}
                  </div>
                </div>
                <div className="border-l border-[var(--border-color)] pl-4">
                  <div className="text-[10px] uppercase text-[var(--text-secondary)]">
                    States
                  </div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">
                    {health?.stats.statesCovered ?? "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Section */}
            {/* Price unit selector */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--text-secondary)] font-mono">
                Unit:
              </span>
              <button
                onClick={() => setPriceUnit("quintal")}
                className={`px-2.5 py-1 border transition-colors ${priceUnit === "quintal" ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)]" : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              >
                {t("unit.quintal")}
              </button>
              <button
                onClick={() => setPriceUnit("kg")}
                className={`px-2.5 py-1 border transition-colors ${priceUnit === "kg" ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)]" : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              >
                {t("unit.kg")}
              </button>
            </div>

            <FilterSection
              selectedState={selectedState}
              onStateChange={handleStateChange}
              selectedDistrict={selectedDistrict}
              onDistrictChange={handleDistrictChange}
              selectedMarket={selectedMarket}
              onMarketChange={handleMarketChange}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              selectedSort={selectedSort}
              onSortChange={handleSortChange}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
              totalResults={meta.total}
            />

            {/* Price Table Results */}
            <PriceTable
              records={records}
              meta={meta}
              loading={loadingPrices}
              unit={priceUnit}
              onPageChange={setOffset}
              onSelectCompare={handleSelectCompare}
              onSelectTrend={handleSelectTrend}
              isCommodityFavorite={(c) => watchlist.has("commodity", c)}
              isMarketFavorite={(m) => watchlist.has("market", m)}
              onToggleCommodityFavorite={(c) =>
                watchlist.toggle({ type: "commodity", key: c })
              }
              onToggleMarketFavorite={(m) =>
                watchlist.toggle({ type: "market", key: m })
              }
            />
          </div>
        )}

        {/* Tab 2: Market Comparison */}
        {currentTab === "compare" && (
          <Suspense
            fallback={
              <div className="p-8 text-[var(--text-secondary)]">
                Loading comparison...
              </div>
            }
          >
            <MarketComparison
              initialCommodity={compareCommodity}
              unit={priceUnit}
              onSelectTrend={handleSelectTrend}
            />
          </Suspense>
        )}

        {/* Tab 3: Price Trends */}
        {currentTab === "trends" && (
          <Suspense
            fallback={
              <div className="p-8 text-[var(--text-secondary)]">
                Loading trends...
              </div>
            }
          >
            <PriceTrendView
              initialCommodity={trendTarget.commodity}
              initialMarket={trendTarget.market}
              initialState={trendTarget.state}
              initialDistrict={trendTarget.district}
              unit={priceUnit}
            />
          </Suspense>
        )}

        {/* Tab: Price Calculator */}
        {currentTab === "calculator" && (
          <Suspense
            fallback={
              <div className="p-8 text-[var(--text-secondary)]">
                Loading calculator...
              </div>
            }
          >
            <PriceCalculator unit={priceUnit} />
          </Suspense>
        )}

        {/* Tab: Watchlist */}
        {currentTab === "watchlist" && (
          <Suspense
            fallback={
              <div className="p-8 text-[var(--text-secondary)]">
                Loading watchlist...
              </div>
            }
          >
            <Watchlist
              items={watchlist.items}
              onRemove={watchlist.remove}
              unit={priceUnit}
              onSelectTrend={handleSelectTrend}
            />
          </Suspense>
        )}

        {/* Tab 4: API & Sync Status */}
        {currentTab === "sync" && (
          <Suspense
            fallback={
              <div className="p-8 text-[var(--text-secondary)]">
                Loading sync status...
              </div>
            }
          >
            <SyncStatusView
              health={health}
              onRefreshHealth={fetchHealthStats}
            />
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
