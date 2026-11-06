import React, { useState, useEffect, useRef } from "react";
import { Search, X, Filter, ArrowUpDown } from "lucide-react";
import { api } from "../services/apiClient.js";
import { useLanguage } from "../context/LanguageContext.js";

interface FilterSectionProps {
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedMarket: string;
  onMarketChange: (market: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  totalResults: number;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  selectedState,
  onStateChange,
  selectedDistrict,
  onDistrictChange,
  selectedMarket,
  onMarketChange,
  searchQuery,
  onSearchChange,
  selectedSort,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
  totalResults,
}) => {
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Hydrate recent searches from localStorage (safe)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rategpt_recent_searches");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed.filter((x) => typeof x === "string").slice(0, 5),
          );
        }
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const addRecentSearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches((prev) => {
      const next = [
        t,
        ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase()),
      ].slice(0, 5);
      try {
        localStorage.setItem("rategpt_recent_searches", JSON.stringify(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  // Load available states on mount
  useEffect(() => {
    let active = true;
    api
      .getFilters()
      .then((meta) => {
        if (active) {
          setStates(meta.states);
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, []);

  // When state changes, update available districts and markets
  useEffect(() => {
    let active = true;
    api
      .getFilters(selectedState || undefined)
      .then((meta) => {
        if (active) {
          setDistricts(meta.districts);
          setMarkets(meta.markets);
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, [selectedState]);

  // When district changes, update available markets
  useEffect(() => {
    let active = true;
    api
      .getFilters(selectedState || undefined, selectedDistrict || undefined)
      .then((meta) => {
        if (active) {
          setMarkets(meta.markets);
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, [selectedState, selectedDistrict]);

  // Autocomplete suggestions for commodities
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      api
        .searchCommodities(searchQuery)
        .then((list) => {
          setSuggestions(list);
        })
        .catch(console.error);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onStateChange(val);
    onDistrictChange("");
    onMarketChange("");
  };

  const handleDistrictSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onDistrictChange(val);
    onMarketChange("");
  };

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 mb-6 transition-colors">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Search & Location Filters
          </h2>
        </div>
        <div className="text-xs text-[var(--text-secondary)] font-mono">
          {totalResults} record{totalResults === 1 ? "" : "s"} matching
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Commodity Search with Autocomplete */}
        <div className="relative" ref={searchContainerRef}>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t("filter.search")}
          </label>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addRecentSearch(searchQuery);
                  setShowSuggestions(false);
                }
              }}
              placeholder={t("filter.searchPlaceholder")}
              aria-label="Search commodity or market"
              className="w-full pl-9 pr-8 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-2 focus:outline-[var(--outline-focus)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-md z-40 max-h-48 overflow-y-auto">
              <div className="p-1.5 text-[11px] font-mono uppercase text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                Matching Commodities
              </div>
              {suggestions.map((comm) => (
                <button
                  key={comm}
                  type="button"
                  onClick={() => {
                    onSearchChange(comm);
                    addRecentSearch(comm);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-page)] border-b border-[var(--border-color)] last:border-b-0"
                >
                  {comm}
                </button>
              ))}
            </div>
          )}
        </div>

        {recentSearches.length > 0 && !searchQuery.trim() && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--text-secondary)]">Recent:</span>
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onSearchChange(term)}
                className="px-2 py-0.5 border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-page)]"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* State Filter */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t("filter.state")}
          </label>
          <select
            value={selectedState}
            onChange={handleStateSelect}
            aria-label="State filter"
            className="w-full py-2 px-3 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-2 focus:outline-[var(--outline-focus)]"
          >
            {states.length === 0 && (
              <option value="">{t("filter.loadingStates")}</option>
            )}
            {states.length > 0 && (
              <option value="">
                {t("filter.allStates")} ({states.length})
              </option>
            )}
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t("filter.district")}
          </label>
          <select
            value={selectedDistrict}
            onChange={handleDistrictSelect}
            disabled={districts.length === 0}
            aria-label="District filter"
            className="w-full py-2 px-3 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-2 focus:outline-[var(--outline-focus)] disabled:opacity-50"
          >
            <option value="">
              {selectedState
                ? `${t("filter.allDistricts")} in ${selectedState}`
                : t("filter.allDistricts")}
            </option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Market / Mandi Filter */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t("filter.market")}
          </label>
          <select
            value={selectedMarket}
            onChange={(e) => onMarketChange(e.target.value)}
            disabled={markets.length === 0}
            aria-label="Market filter"
            className="w-full py-2 px-3 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-2 focus:outline-[var(--outline-focus)] disabled:opacity-50"
          >
            <option value="">
              {t("filter.allMarkets")} ({markets.length})
            </option>
            {markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-bar: Sort Options & Clear Filter Action */}
      <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span className="text-[var(--text-secondary)]">
            {t("filter.sort")}:
          </span>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort order"
            className="py-1 px-2 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-1 focus:outline-[var(--outline-focus)]"
          >
            <option value="date_desc">{t("filter.sort.dateDesc")}</option>
            <option value="date_asc">{t("filter.sort.dateAsc")}</option>
            <option value="modal_price_desc">
              {t("filter.sort.modalDesc")}
            </option>
            <option value="modal_price_asc">{t("filter.sort.modalAsc")}</option>
            <option value="commodity_asc">
              {t("filter.sort.commodityAsc")}
            </option>
            <option value="commodity_desc">
              {t("filter.sort.commodityDesc")}
            </option>
            <option value="market_asc">{t("filter.sort.marketAsc")}</option>
            <option value="market_desc">{t("filter.sort.marketDesc")}</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-1 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors flex items-center space-x-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t("filter.reset")}</span>
          </button>
        )}
      </div>
    </section>
  );
};
