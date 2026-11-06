import React, { useEffect, useState } from "react";
import { api } from "../services/apiClient.js";
import { MandiRecord } from "../types/mandi.js";
import {
  PriceUnit,
  formatPrice as formatPriceUnit,
} from "../utils/priceUnit.js";
import { Star, Trash2, Layers, MapPin } from "lucide-react";
import { WatchlistItem } from "../hooks/useWatchlist.js";
import { useLanguage } from "../context/LanguageContext.js";

interface WatchlistProps {
  items: WatchlistItem[];
  onRemove: (item: WatchlistItem) => void;
  unit: PriceUnit;
  onSelectTrend: (
    commodity: string,
    market: string,
    state: string,
    district: string,
  ) => void;
}

interface ResolvedItem {
  item: WatchlistItem;
  records: MandiRecord[];
  loading: boolean;
  error: string | null;
}

export const Watchlist: React.FC<WatchlistProps> = ({
  items,
  onRemove,
  unit,
  onSelectTrend,
}) => {
  const { t } = useLanguage();
  const [resolved, setResolved] = useState<ResolvedItem[]>([]);

  useEffect(() => {
    let active = true;
    const initial: ResolvedItem[] = items.map((item) => ({
      item,
      records: [],
      loading: true,
      error: null,
    }));
    setResolved(initial);

    items.forEach((item, idx) => {
      const params =
        item.type === "commodity"
          ? { commodity: item.key, limit: 5, sort: "date_desc" }
          : { market: item.key, limit: 5, sort: "date_desc" };
      api
        .getPrices(params)
        .then((res) => {
          if (!active) return;
          setResolved((prev) => {
            const next = [...prev];
            next[idx] = {
              item,
              records: res.records,
              loading: false,
              error: null,
            };
            return next;
          });
        })
        .catch((e) => {
          if (!active) return;
          setResolved((prev) => {
            const next = [...prev];
            next[idx] = {
              item,
              records: [],
              loading: false,
              error: e?.message || "Failed to load",
            };
            return next;
          });
        });
    });

    return () => {
      active = false;
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-10 text-center">
        <Star className="w-8 h-8 mx-auto text-[var(--text-secondary)] mb-3" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t("watchlist.empty.title")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
          {t("watchlist.empty.desc")}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {resolved.map(({ item, records, loading, error }) => (
        <div
          key={`${item.type}:${item.key}`}
          className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {item.type === "commodity" ? (
                <Layers className="w-4 h-4 text-[var(--text-secondary)]" />
              ) : (
                <MapPin className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
              <h3 className="font-semibold text-[var(--text-primary)]">
                {item.key}
              </h3>
              <span className="text-[10px] font-mono uppercase border border-[var(--border-color)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                {item.type}
              </span>
            </div>
            <button
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item.key} from watchlist`}
              className="p-1.5 border border-[var(--border-color)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading && (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-[var(--border-color)] w-1/3" />
              <div className="h-8 bg-[var(--border-color)] w-full" />
            </div>
          )}

          {error && (
            <p className="text-xs text-[var(--text-secondary)]">{error}</p>
          )}

          {!loading && !error && records.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)]">
              {t("watchlist.noRecords")} {item.type}.
            </p>
          )}

          {!loading && records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[var(--text-secondary)] uppercase font-mono">
                  <tr>
                    <th scope="col" className="text-left py-1 pr-2">
                      {item.type === "commodity" ? "Market" : "Commodity"}
                    </th>
                    <th scope="col" className="text-right py-1 px-2">
                      Modal
                    </th>
                    <th scope="col" className="text-right py-1 px-2">
                      Date
                    </th>
                    <th scope="col" className="text-right py-1 pl-2">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {records.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 pr-2 text-[var(--text-primary)]">
                        {item.type === "commodity" ? r.market : r.commodity}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-[var(--text-primary)]">
                        {formatPriceUnit(r.modal_price, unit)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[var(--text-secondary)]">
                        {r.arrival_date}
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        <button
                          onClick={() =>
                            onSelectTrend(
                              r.commodity,
                              r.market,
                              r.state,
                              r.district,
                            )
                          }
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          Trend
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
