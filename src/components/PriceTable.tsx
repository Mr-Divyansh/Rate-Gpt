import React from "react";
import { MandiRecord, PaginationMeta } from "../types/mandi.js";
import {
  PriceUnit,
  formatPrice as formatPriceUnit,
  convertPrice,
} from "../utils/priceUnit.js";
import {
  Calendar,
  MapPin,
  TrendingUp,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
  Star,
  Store,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.js";

interface PriceTableProps {
  records: MandiRecord[];
  meta: PaginationMeta;
  loading: boolean;
  unit: PriceUnit;
  onPageChange: (newOffset: number) => void;
  onSelectCompare: (commodity: string) => void;
  onSelectTrend: (
    commodity: string,
    market: string,
    state: string,
    district: string,
  ) => void;
  isCommodityFavorite?: (commodity: string) => boolean;
  isMarketFavorite?: (market: string) => boolean;
  onToggleCommodityFavorite?: (commodity: string) => void;
  onToggleMarketFavorite?: (market: string) => void;
}

export const PriceTable: React.FC<PriceTableProps> = ({
  records,
  meta,
  loading,
  unit,
  onPageChange,
  onSelectCompare,
  onSelectTrend,
  isCommodityFavorite,
  isMarketFavorite,
  onToggleCommodityFavorite,
  onToggleMarketFavorite,
}) => {
  const { t } = useLanguage();
  const currentPage = Math.floor(meta.offset / meta.limit) + 1;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  const formatPrice = (val: number | null | undefined) =>
    formatPriceUnit(val, unit);

  const handleExport = () => {
    if (!records.length) return;
    const header = [
      "Commodity",
      "Variety",
      "Grade",
      "Market",
      "District",
      "State",
      "Arrival Date",
      "Min Price",
      "Max Price",
      "Modal Price",
      "Unit",
    ];
    const rows = records.map((r) => [
      r.commodity,
      r.variety || "",
      r.grade || "",
      r.market,
      r.district,
      r.state,
      r.arrival_date,
      r.min_price ?? "",
      r.max_price ?? "",
      r.modal_price ?? "",
      r.source_unit || "Rs/Quintal",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rategpt-prices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 text-center"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[var(--border-color)] w-1/4 mx-auto"></div>
          <div className="h-10 bg-[var(--border-color)] w-full"></div>
          <div className="h-10 bg-[var(--border-color)] w-full"></div>
          <div className="h-10 bg-[var(--border-color)] w-full"></div>
        </div>
        <p className="mt-4 text-xs font-mono text-[var(--text-secondary)]">
          {t("table.loading")}
        </p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-10 text-center">
        <AlertCircle className="w-8 h-8 mx-auto text-[var(--text-secondary)] mb-3" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t("table.empty.title")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
          {t("table.empty.desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto border border-[var(--border-color)] bg-[var(--bg-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-page)] border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs uppercase font-mono tracking-wider">
            <tr>
              <th scope="col" className="py-3 px-4">
                {t("table.col.commodity")}
              </th>
              <th scope="col" className="py-3 px-4">
                {t("table.col.market")}
              </th>
              <th scope="col" className="py-3 px-4">
                {t("table.col.stateDistrict")}
              </th>
              <th scope="col" className="py-3 px-4">
                {t("table.col.date")}
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                {t("table.col.min")}
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                {t("table.col.max")}
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right font-bold text-[var(--text-primary)]"
              >
                {t("table.col.modal")}
              </th>
              <th scope="col" className="py-3 px-4 text-center">
                {t("table.col.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {records.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-[var(--bg-page)] transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="font-semibold text-[var(--text-primary)]">
                    {r.commodity}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Variety: {r.variety || "Other"} • Grade: {r.grade || "FAQ"}
                  </div>
                </td>

                <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                  {r.market}
                </td>

                <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                  <div>{r.district}</div>
                  <div>{r.state}</div>
                </td>

                <td className="py-3 px-4 text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
                    <span>{r.arrival_date}</span>
                  </div>
                </td>

                <td className="py-3 px-4 text-right font-mono text-xs text-[var(--text-secondary)]">
                  {formatPrice(r.min_price)}
                </td>

                <td className="py-3 px-4 text-right font-mono text-xs text-[var(--text-secondary)]">
                  {formatPrice(r.max_price)}
                </td>

                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-bold text-base text-[var(--text-primary)]">
                    {formatPrice(r.modal_price)}
                  </span>
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                    /{r.source_unit || "Quintal"}
                  </div>
                </td>

                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-1 text-xs">
                    <button
                      onClick={() => onSelectCompare(r.commodity)}
                      title="Compare price across all mandis"
                      className="px-2 py-1 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors"
                    >
                      {t("table.compare")}
                    </button>
                    <button
                      onClick={() =>
                        onSelectTrend(
                          r.commodity,
                          r.market,
                          r.state,
                          r.district,
                        )
                      }
                      title="View historical trend for this mandi"
                      className="px-2 py-1 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors flex items-center space-x-1"
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>{t("table.trend")}</span>
                    </button>
                    {onToggleCommodityFavorite && (
                      <button
                        onClick={() => onToggleCommodityFavorite(r.commodity)}
                        aria-label={
                          isCommodityFavorite?.(r.commodity)
                            ? `Remove ${r.commodity} from watchlist`
                            : `Add ${r.commodity} to watchlist`
                        }
                        title="Favorite commodity"
                        className="px-2 py-1 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${isCommodityFavorite?.(r.commodity) ? "fill-current" : ""}`}
                        />
                      </button>
                    )}
                    {onToggleMarketFavorite && (
                      <button
                        onClick={() => onToggleMarketFavorite(r.market)}
                        aria-label={
                          isMarketFavorite?.(r.market)
                            ? `Remove ${r.market} from watchlist`
                            : `Add ${r.market} to watchlist`
                        }
                        title="Favorite market"
                        className="px-2 py-1 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors"
                      >
                        <Store
                          className={`w-3.5 h-3.5 ${isMarketFavorite?.(r.market) ? "fill-current text-[var(--color-accent)]" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="md:hidden space-y-3">
        {records.map((r) => (
          <div
            key={r.id}
            className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 space-y-3 transition-colors"
          >
            {/* Top row: Commodity & Date */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {r.commodity}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {r.variety || "Other"} • {r.grade || "FAQ"}
                </p>
              </div>
              <div className="flex items-center space-x-1 text-xs font-mono text-[var(--text-secondary)] border border-[var(--border-color)] px-2 py-0.5">
                <Calendar className="w-3 h-3" />
                <span>{r.arrival_date}</span>
              </div>
            </div>

            {/* Location row */}
            <div className="flex items-center space-x-1 text-xs text-[var(--text-secondary)]">
              <MapPin className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span>
                <strong className="text-[var(--text-primary)]">
                  {r.market}
                </strong>
                , {r.district}, {r.state}
              </span>
            </div>

            {/* Price values grid */}
            <div className="grid grid-cols-3 gap-2 border-t border-b border-[var(--border-color)] py-2 text-center">
              <div>
                <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                  Min
                </div>
                <div className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                  {formatPrice(r.min_price)}
                </div>
              </div>
              <div className="border-x border-[var(--border-color)]">
                <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                  Modal Price
                </div>
                <div className="text-sm font-mono font-bold text-[var(--text-primary)]">
                  {formatPrice(r.modal_price)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                  Max
                </div>
                <div className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                  {formatPrice(r.max_price)}
                </div>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex items-center space-x-2 pt-1 text-xs">
              <button
                onClick={() => onSelectCompare(r.commodity)}
                className="flex-1 py-1.5 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] text-center transition-colors flex items-center justify-center space-x-1"
              >
                <Layers className="w-3 h-3" />
                <span>{t("table.compare")}</span>
              </button>
              <button
                onClick={() =>
                  onSelectTrend(r.commodity, r.market, r.state, r.district)
                }
                className="flex-1 py-1.5 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] text-center transition-colors flex items-center justify-center space-x-1"
              >
                <TrendingUp className="w-3 h-3" />
                <span>{t("table.trend")}</span>
              </button>
              {onToggleCommodityFavorite && (
                <button
                  onClick={() => onToggleCommodityFavorite(r.commodity)}
                  aria-label={
                    isCommodityFavorite?.(r.commodity)
                      ? `Remove ${r.commodity} from watchlist`
                      : `Add ${r.commodity} to watchlist`
                  }
                  className="py-1.5 px-3 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors flex items-center justify-center"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${isCommodityFavorite?.(r.commodity) ? "fill-current" : ""}`}
                  />
                </button>
              )}
              {onToggleMarketFavorite && (
                <button
                  onClick={() => onToggleMarketFavorite(r.market)}
                  aria-label={
                    isMarketFavorite?.(r.market)
                      ? `Remove ${r.market} from watchlist`
                      : `Add ${r.market} to watchlist`
                  }
                  className="py-1.5 px-3 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors flex items-center justify-center"
                >
                  <Store
                    className={`w-3.5 h-3.5 ${isMarketFavorite?.(r.market) ? "fill-current text-[var(--color-accent)]" : ""}`}
                  />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 gap-3 text-xs">
        <div className="text-[var(--text-secondary)] font-mono">
          Showing {meta.offset + 1}–
          {Math.min(meta.offset + meta.limit, meta.total)} of {meta.total}{" "}
          records
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            disabled={!records.length}
            aria-label="Export current page to CSV"
            className="px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 transition-colors flex items-center space-x-1"
            title="Export current page to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t("table.export")}</span>
          </button>
          <button
            onClick={() => onPageChange(meta.offset - meta.limit)}
            disabled={meta.offset === 0}
            aria-label="Previous page"
            className="px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 transition-colors flex items-center space-x-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{t("table.prev")}</span>
          </button>

          <span className="font-mono text-[var(--text-primary)] px-2">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(meta.offset + meta.limit)}
            disabled={!meta.hasNext}
            aria-label="Next page"
            className="px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 transition-colors flex items-center space-x-1"
          >
            <span>{t("table.next")}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
