import React, { useState, useEffect } from "react";
import { MandiRecord } from "../types/mandi.js";
import { api } from "../services/apiClient.js";
import {
  PriceUnit,
  formatPrice as formatPriceUnit,
  convertPrice,
} from "../utils/priceUnit.js";
import { useLanguage } from "../context/LanguageContext.js";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, AlertCircle, Info, Calendar } from "lucide-react";

interface PriceTrendViewProps {
  initialCommodity?: string;
  initialMarket?: string;
  initialState?: string;
  initialDistrict?: string;
  unit: PriceUnit;
}

export const PriceTrendView: React.FC<PriceTrendViewProps> = ({
  initialCommodity = "",
  initialMarket = "",
  initialState = "",
  initialDistrict = "",
  unit,
}) => {
  const [commodity, setCommodity] = useState(initialCommodity);
  const [market, setMarket] = useState(initialMarket);
  const [state, setState] = useState(initialState);
  const [district, setDistrict] = useState(initialDistrict);

  const { t } = useLanguage();

  const [availableCommodities, setAvailableCommodities] = useState<string[]>(
    [],
  );
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [records, setRecords] = useState<MandiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<"all" | "7" | "30" | "90">("all");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getFilters(),
      api.getPrices({ limit: 1, sort: "date_desc" }),
    ])
      .then(([m, latest]) => {
        if (!active) return;
        setAvailableCommodities(m.commodities);
        setAvailableMarkets(m.markets);
        const latestRecord = latest.records[0];
        setCommodity((current) =>
          m.commodities.includes(current)
            ? current
            : (latestRecord?.commodity ?? m.commodities[0] ?? ""),
        );
        setMarket((current) =>
          m.markets.includes(current)
            ? current
            : (latestRecord?.market ?? m.markets[0] ?? ""),
        );
        if (!state && latestRecord) setState(latestRecord.state);
        if (!district && latestRecord) setDistrict(latestRecord.district);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!commodity || !market) return;
    setLoading(true);
    api
      .getTrend(commodity, market, state || undefined, district || undefined)
      .then((list) => setRecords(list))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [commodity, market, state, district]);

  // Chart data format (filtered by date range; missing dates remain gaps)
  const maxDate = records.length
    ? new Date(records[records.length - 1].arrival_date)
    : null;
  const cutoff =
    maxDate && dateRange !== "all"
      ? new Date(
          maxDate.getTime() - parseInt(dateRange, 10) * 24 * 60 * 60 * 1000,
        )
      : null;

  const filteredRecords = cutoff
    ? records.filter((r) => new Date(r.arrival_date) >= cutoff)
    : records;

  const chartData = filteredRecords.map((r) => ({
    date: r.arrival_date,
    modalPrice: convertPrice(r.modal_price, unit),
    minPrice: convertPrice(r.min_price, unit),
    maxPrice: convertPrice(r.max_price, unit),
    unit,
  }));

  const modalVals = filteredRecords
    .map((r) => r.modal_price)
    .filter((v): v is number => v != null);
  const minModal = modalVals.length ? Math.min(...modalVals) : null;
  const maxModal = modalVals.length ? Math.max(...modalVals) : null;
  const avgModal = modalVals.length
    ? Math.round(modalVals.reduce((a, b) => a + b, 0) / modalVals.length)
    : null;

  return (
    <div className="space-y-6">
      {/* Configuration Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>{t("trends.title")}</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Historical observations stored in the Rate GPT database
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">
                Commodity:
              </label>
              <select
                value={commodity}
                disabled={availableCommodities.length === 0}
                onChange={(e) => setCommodity(e.target.value)}
                className="py-1 px-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-2 focus:outline-[var(--outline-focus)]"
              >
                {availableCommodities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {availableCommodities.length === 0 && (
                  <option value="">No stored commodities</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">
                Market / Mandi:
              </label>
              <select
                value={market}
                disabled={availableMarkets.length === 0}
                onChange={(e) => setMarket(e.target.value)}
                className="py-1 px-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-2 focus:outline-[var(--outline-focus)]"
              >
                {availableMarkets.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {availableMarkets.length === 0 && (
                  <option value="">No stored markets</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="mt-4 p-3 border border-[var(--border-color)] bg-[var(--bg-page)] text-xs flex items-start space-x-2 text-[var(--text-secondary)]">
          <Info className="w-4 h-4 shrink-0 text-[var(--text-primary)] mt-0.5" />
          <div>
            <strong className="text-[var(--text-primary)]">Data note:</strong>
            <span className="ml-1">
              The chart shows stored observations only and does not synthesize,
              predict, or interpolate prices. Source and freshness depend on
              synchronization status.
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-8 text-center text-xs text-[var(--text-secondary)] border border-[var(--border-color)] bg-[var(--bg-surface)]">
          {t("common.loading")} price history...
        </div>
      ) : records.length === 0 ? (
        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-10 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-[var(--text-secondary)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No stored historical observations found.
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
            {commodity && market
              ? `No stored historical observations were found for ${commodity} at ${market}. Trends will accumulate if synchronization is configured and runs successfully.`
              : "No market records are available to build a trend chart. Trends will appear after synchronization stores valid observations."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart View */}
          <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {commodity} Price Movement at {market}
                </h3>
                <span className="text-xs text-[var(--text-secondary)] font-mono">
                  {filteredRecords.length} observation
                  {filteredRecords.length === 1 ? "" : "s"} recorded
                  {filteredRecords.length
                    ? ` (${filteredRecords[0].arrival_date} to ${filteredRecords[filteredRecords.length - 1].arrival_date})`
                    : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label
                  className="text-[11px] font-mono text-[var(--text-secondary)]"
                  htmlFor="dateRange"
                >
                  Date range
                </label>
                <select
                  id="dateRange"
                  value={dateRange}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "all" ||
                      value === "7" ||
                      value === "30" ||
                      value === "90"
                    ) {
                      setDateRange(value);
                    }
                  }}
                  aria-label="Date range"
                  className="py-1 px-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-2 focus:outline-[var(--outline-focus)]"
                >
                  <option value="all">All available</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>

            {minModal != null && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border border-[var(--border-color)] p-3">
                  <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                    Min Modal
                  </div>
                  <div className="text-base font-mono font-bold text-[var(--text-primary)] mt-1">
                    {formatPriceUnit(minModal, unit)}
                  </div>
                </div>
                <div className="border border-[var(--border-color)] p-3 bg-[var(--bg-page)]">
                  <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                    Modal (avg)
                  </div>
                  <div className="text-base font-mono font-bold text-[var(--text-primary)] mt-1">
                    {avgModal != null ? formatPriceUnit(avgModal, unit) : "—"}
                  </div>
                </div>
                <div className="border border-[var(--border-color)] p-3">
                  <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">
                    Max Modal
                  </div>
                  <div className="text-base font-mono font-bold text-[var(--text-primary)] mt-1">
                    {formatPriceUnit(maxModal, unit)}
                  </div>
                </div>
              </div>
            )}

            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    stroke="var(--border-color)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    tickLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      borderRadius: "0px",
                    }}
                    formatter={(val: any) => [
                      `₹${val} / ${unit === "kg" ? "Kg" : "Quintal"}`,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxPrice"
                    name="Max Price"
                    stroke="#9ca3af"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="modalPrice"
                    name="Modal Price"
                    stroke="var(--text-primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="minPrice"
                    name="Min Price"
                    stroke="#6b7280"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table of stored historical observations */}
          <div className="border border-[var(--border-color)] bg-[var(--bg-surface)]">
            <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-page)] text-xs font-mono font-semibold uppercase text-[var(--text-secondary)]">
              Recorded Observations Audit Table
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border-color)] text-[var(--text-secondary)] font-mono">
                  <tr>
                    <th className="py-2.5 px-4">Arrival Date</th>
                    <th className="py-2.5 px-4">Variety</th>
                    <th className="py-2.5 px-4">Grade</th>
                    <th className="py-2.5 px-4 text-right">Min Price</th>
                    <th className="py-2.5 px-4 text-right">Max Price</th>
                    <th className="py-2.5 px-4 text-right font-bold text-[var(--text-primary)]">
                      Modal Price
                    </th>
                    <th className="py-2.5 px-4 text-right">Recorded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-page)]">
                      <td className="py-2.5 px-4 font-mono font-medium text-[var(--text-primary)]">
                        {r.arrival_date}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                        {r.variety || "Other"}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                        {r.grade || "FAQ"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[var(--text-secondary)]">
                        {r.min_price != null
                          ? formatPriceUnit(r.min_price, unit)
                          : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[var(--text-secondary)]">
                        {r.max_price != null
                          ? formatPriceUnit(r.max_price, unit)
                          : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[var(--text-primary)]">
                        {r.modal_price != null
                          ? formatPriceUnit(r.modal_price, unit)
                          : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[10px] text-[var(--text-secondary)]">
                        {r.first_fetched_at.slice(0, 19).replace("T", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
