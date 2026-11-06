import React, { useState, useEffect } from "react";
import { MandiRecord } from "../types/mandi.js";
import { api } from "../services/apiClient.js";
import {
  PriceUnit,
  formatPrice as formatPriceUnit,
} from "../utils/priceUnit.js";
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.js";

interface MarketComparisonProps {
  initialCommodity?: string;
  unit: PriceUnit;
  onSelectTrend: (
    commodity: string,
    market: string,
    state: string,
    district: string,
  ) => void;
}

export const MarketComparison: React.FC<MarketComparisonProps> = ({
  initialCommodity = "Wheat",
  unit,
  onSelectTrend,
}) => {
  const { t } = useLanguage();
  const [commodity, setCommodity] = useState(initialCommodity);
  const [availableCommodities, setAvailableCommodities] = useState<string[]>(
    [],
  );
  const [records, setRecords] = useState<MandiRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .getFilters()
      .then((m) => setAvailableCommodities(m.commodities))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!commodity) return;
    setLoading(true);
    api
      .getComparison(commodity)
      .then((list) => {
        setRecords(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [commodity]);

  // Check if dates differ across markets
  const uniqueDates = Array.from(new Set(records.map((r) => r.arrival_date)));
  const hasDateMismatch = uniqueDates.length > 1;

  // Compute statistics
  const validModalPrices = records
    .map((r) => r.modal_price)
    .filter((p): p is number => p !== null && p !== undefined);

  const avgModalPrice =
    validModalPrices.length > 0
      ? Math.round(
          validModalPrices.reduce((a, b) => a + b, 0) / validModalPrices.length,
        )
      : null;

  const minModalPrice =
    validModalPrices.length > 0 ? Math.min(...validModalPrices) : null;
  const maxModalPrice =
    validModalPrices.length > 0 ? Math.max(...validModalPrices) : null;

  return (
    <div className="space-y-6">
      {/* Selector Section */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {t("compare.title")}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {t("compare.desc")}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              {t("compare.commodity")}:
            </label>
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              className="py-1.5 px-3 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-medium focus:outline-2 focus:outline-[var(--outline-focus)]"
            >
              {availableCommodities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Warning Banner if dates differ */}
        {hasDateMismatch && (
          <div className="mt-4 p-3 border border-amber-600/30 bg-amber-500/10 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-primary)]">
                Notice: Record Dates Vary Between Mandis.
              </strong>
              <p className="text-[var(--text-secondary)] mt-0.5">
                The compared markets reported observations on different dates (
                {uniqueDates.join(", ")}). Check the individual arrival date
                badge on each market card.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      {avgModalPrice !== null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">
            <div className="text-[10px] font-mono uppercase text-[var(--text-secondary)]">
              Average Modal Price
            </div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[var(--text-primary)] mt-1">
              ₹{avgModalPrice.toLocaleString("en-IN")}
              <span className="text-xs font-normal text-[var(--text-secondary)] ml-1">
                / Quintal
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
              Across {records.length} reported markets
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">
            <div className="text-[10px] font-mono uppercase text-[var(--text-secondary)]">
              Lowest Mandi Rate
            </div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[var(--text-primary)] mt-1">
              ₹{minModalPrice?.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1 truncate">
              {records.find((r) => r.modal_price === minModalPrice)?.market} (
              {records.find((r) => r.modal_price === minModalPrice)?.state})
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">
            <div className="text-[10px] font-mono uppercase text-[var(--text-secondary)]">
              Highest Mandi Rate
            </div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[var(--text-primary)] mt-1">
              ₹{maxModalPrice?.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1 truncate">
              {records.find((r) => r.modal_price === maxModalPrice)?.market} (
              {records.find((r) => r.modal_price === maxModalPrice)?.state})
            </div>
          </div>
        </div>
      )}

      {/* Comparison Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-[var(--text-secondary)] border border-[var(--border-color)]">
          Loading market comparison...
        </div>
      ) : records.length === 0 ? (
        <div className="p-8 text-center border border-[var(--border-color)] bg-[var(--bg-surface)]">
          <p className="text-sm text-[var(--text-secondary)]">
            No market comparison data currently available for {commodity}.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-page)] text-xs font-mono text-[var(--text-secondary)] flex justify-between">
            <span>Market / Mandi</span>
            <span>Modal Price & Spread vs Average</span>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {records.map((r) => {
              const diff =
                r.modal_price && avgModalPrice
                  ? r.modal_price - avgModalPrice
                  : null;
              const isHighest = r.modal_price === maxModalPrice;
              const isLowest = r.modal_price === minModalPrice;

              return (
                <div
                  key={r.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-page)] transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-base text-[var(--text-primary)]">
                        {r.market}
                      </span>
                      {isHighest && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[var(--border-color)] text-[var(--text-primary)] font-bold">
                          {t("compare.highest")}
                        </span>
                      )}
                      {isLowest && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[var(--border-color)] text-[var(--text-secondary)]">
                          {t("compare.lowest")}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {r.district}, {r.state} • Variety: {r.variety || "Other"}
                    </div>

                    <div className="flex items-center space-x-1 text-xs font-mono text-[var(--text-secondary)] mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {t("compare.reported")}: {r.arrival_date}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Prices & Spread */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border-color)]">
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg text-[var(--text-primary)]">
                        {r.modal_price != null
                          ? formatPriceUnit(r.modal_price, unit)
                          : "—"}
                      </div>
                      <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                        Min:{" "}
                        {r.min_price != null
                          ? formatPriceUnit(r.min_price, unit)
                          : "—"}{" "}
                        • Max:{" "}
                        {r.max_price != null
                          ? formatPriceUnit(r.max_price, unit)
                          : "—"}
                      </div>
                    </div>

                    {diff !== null && (
                      <div className="text-xs font-mono mt-1 flex items-center space-x-1">
                        {diff > 0 ? (
                          <>
                            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              +₹{diff} vs avg
                            </span>
                          </>
                        ) : diff < 0 ? (
                          <>
                            <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              -₹{Math.abs(diff)} vs avg
                            </span>
                          </>
                        ) : (
                          <span className="text-[var(--text-secondary)]">
                            = Average
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() =>
                        onSelectTrend(
                          r.commodity,
                          r.market,
                          r.state,
                          r.district,
                        )
                      }
                      className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline decoration-dotted"
                    >
                      {t("compare.viewHistory")} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
