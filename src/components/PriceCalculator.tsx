import React, { useState, useEffect } from "react";
import { api } from "../services/apiClient.js";
import { PriceUnit, convertPrice } from "../utils/priceUnit.js";
import { Calculator, IndianRupee, AlertCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.js";

interface PriceCalculatorProps {
  unit: PriceUnit;
}

export const PriceCalculator: React.FC<PriceCalculatorProps> = ({ unit }) => {
  const { t } = useLanguage();
  const [commodities, setCommodities] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [commodity, setCommodity] = useState("");
  const [market, setMarket] = useState("");
  const [quantity, setQuantity] = useState<string>("1");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFilters()
      .then((m) => {
        setCommodities(m.commodities);
        setMarkets(m.markets);
        if (m.commodities.length) setCommodity(m.commodities[0]);
        if (m.markets.length) setMarket(m.markets[0]);
      })
      .catch((e) => setError(e?.message || "Failed to load filters"));
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const qty = parseFloat(quantity);
    if (!commodity || !market || isNaN(qty) || qty <= 0) {
      setError(t("calc.invalid"));
      return;
    }
    setLoading(true);
    try {
      const res = await api.getPrices({
        commodity,
        market,
        limit: 1,
        offset: 0,
        sort: "date_desc",
      });
      const rec = res.records?.[0];
      if (!rec) {
        setError(t("calc.noData"));
        return;
      }
      const pricePerUnit = convertPrice(rec.modal_price, unit);
      const total = pricePerUnit != null ? pricePerUnit * qty : null;
      setResult({ record: rec, pricePerUnit, total });
    } catch (err: any) {
      setError(err?.message || "Failed to fetch price data.");
    } finally {
      setLoading(false);
    }
  };

  const unitName = unit === "kg" ? "Kg" : "Quintal";

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
          <Calculator className="w-4 h-4" />
          <span>{t("calc.title")}</span>
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          {t("calc.desc")}
        </p>

        <form
          onSubmit={handleCalculate}
          className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div>
            <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">
              {t("calc.commodity")}
            </label>
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-2 focus:outline-[var(--outline-focus)]"
            >
              {commodities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">
              {t("calc.market")}
            </label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-2 focus:outline-[var(--outline-focus)]"
            >
              {markets.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">
              Quantity
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-2 focus:outline-[var(--outline-focus)]"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-1.5 px-3 border border-[var(--border-color)] bg-[var(--text-primary)] text-[var(--bg-page)] text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? t("calc.calculating") : t("calc.calculate")}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 border border-rose-600/30 bg-rose-500/10 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="text-[var(--text-primary)]">{error}</span>
          </div>
        )}
      </div>
      {result && result.record && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {result.record.commodity}
            </h3>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {result.record.market}, {result.record.district},{" "}
              {result.record.state}
            </span>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            Arrival date: {result.record.arrival_date} • Unit: ₹ / {unitName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-[var(--border-color)] p-3">
              <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                Price per {unitName}
              </div>
              <div className="text-lg font-mono font-bold text-[var(--text-primary)] mt-1">
                {result.pricePerUnit != null
                  ? `₹${result.pricePerUnit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                  : "—"}
              </div>
            </div>
            <div className="border border-[var(--border-color)] p-3">
              <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                Quantity
              </div>
              <div className="text-lg font-mono font-bold text-[var(--text-primary)] mt-1">
                {quantity} {unitName}
              </div>
            </div>
            <div className="border border-[var(--border-color)] p-3 bg-[var(--bg-page)]">
              <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                Estimated Total
              </div>
              <div className="text-lg font-mono font-bold text-[var(--text-primary)] mt-1 flex items-center space-x-1">
                <IndianRupee className="w-4 h-4" />
                <span>
                  {result.total != null
                    ? result.total.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-3">
            Min:{" "}
            {result.record.min_price != null
              ? `₹${convertPrice(result.record.min_price, unit)?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
              : "—"}{" "}
            • Modal:{" "}
            {result.record.modal_price != null
              ? `₹${convertPrice(result.record.modal_price, unit)?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
              : "—"}{" "}
            • Max:{" "}
            {result.record.max_price != null
              ? `₹${convertPrice(result.record.max_price, unit)?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
              : "—"}
            <span className="ml-1">per {unitName}</span>
          </div>
        </div>
      )}
    </div>
  );
};
