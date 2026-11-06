import React, { useState, useEffect } from "react";
import { api } from "../services/apiClient.js";
import { SyncLogItem, HealthResponse } from "../types/mandi.js";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  Server,
  Database,
  Code,
  ExternalLink,
  Info,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.js";

interface SyncStatusViewProps {
  health: HealthResponse | null;
  onRefreshHealth: () => void;
}

export const SyncStatusView: React.FC<SyncStatusViewProps> = ({
  health,
  onRefreshHealth,
}) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState("");
  const [syncCommodity, setSyncCommodity] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    inserted?: number;
    updated?: number;
  } | null>(null);

  const loadLogs = () => {
    setLoadingLogs(true);
    api
      .getSyncLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoadingLogs(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleTriggerSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await api.triggerSync({
        state: syncState || undefined,
        commodity: syncCommodity || undefined,
        adminKey: adminKey || undefined,
      });

      setSyncResult({
        success: res.success,
        message: res.message,
        inserted: res.recordsInserted,
        updated: res.recordsUpdated,
      });

      loadLogs();
      onRefreshHealth();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || "Synchronization request failed",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Credentials Header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <Server className="w-4 h-4" />
              <span>{t("sync.title")}</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Live status of Open Government Data (OGD) AGMARKNET integration
              and scheduled ingestion
            </p>
          </div>

          <button
            onClick={() => {
              onRefreshHealth();
              loadLogs();
            }}
            className="px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("sync.refresh")}</span>
          </button>
        </div>

        {/* Configuration Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs font-mono">
          <div className="border border-[var(--border-color)] p-3 space-y-2 bg-[var(--bg-page)]">
            <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
              Data Source Information
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Platform: </span>
              <span className="text-[var(--text-primary)]">
                Open Government Data (OGD) Platform India
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Dataset: </span>
              <span className="text-[var(--text-primary)]">
                Current Daily Price of Various Commodities (Mandi)
              </span>
            </div>
            <div className="truncate">
              <span className="text-[var(--text-secondary)]">
                Resource ID:{" "}
              </span>
              <span className="text-[var(--text-primary)]">
                9ef84268-d588-465a-a308-a864a43d0070
              </span>
            </div>
            <div className="truncate">
              <span className="text-[var(--text-secondary)]">
                Base Endpoint:{" "}
              </span>
              <span className="text-[var(--text-primary)]">
                https://api.data.gov.in/resource/...
              </span>
            </div>
          </div>

          <div className="border border-[var(--border-color)] p-3 space-y-2 bg-[var(--bg-page)]">
            <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
              Backend Integration Status
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[var(--text-secondary)]">
                DATA_GOV_API_KEY:{" "}
              </span>
              {health?.upstreamSource.apiKeyConfigured ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Configured in Server Environment</span>
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Placeholder / Using Stored Database</span>
                </span>
              )}
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">
                Security Model:{" "}
              </span>
              <span className="text-[var(--text-primary)]">
                Server-side proxy only (Never exposed to browser)
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">
                Total Database Records:{" "}
              </span>
              <span className="text-[var(--text-primary)] font-bold">
                {health?.stats.totalRecords ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">
                Latest Arrival Date:{" "}
              </span>
              <span className="text-[var(--text-primary)] font-bold">
                {health?.stats.latestArrivalDate ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Developer Guide Callout */}
        <div className="mt-4 p-3 border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
          <div className="flex items-center space-x-1 font-semibold text-[var(--text-primary)] mb-1">
            <Key className="w-3.5 h-3.5" />
            <span>How to supply your Government API Key:</span>
          </div>
          <p>
            1. Register for an API key at{" "}
            <a
              href="https://data.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="underline text-[var(--text-primary)] inline-flex items-center"
            >
              data.gov.in <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
            .
            <br />
            2. In your local or deployment environment, set{" "}
            <code className="bg-[var(--bg-page)] px-1 border border-[var(--border-color)]">
              DATA_GOV_API_KEY="your_key"
            </code>{" "}
            in your server environment file (
            <code className="bg-[var(--bg-page)] px-1 border border-[var(--border-color)]">
              .env
            </code>
            ).
            <br />
            3. The server automatically injects the key into upstream government
            queries while serving sanitized data to this web app.
          </p>
        </div>
      </div>

      {/* Manual Sync Trigger Form */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Trigger Upstream Data Synchronization</span>
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Initiate an on-demand sync from the Government of India mandi data
          resource. Records are idempotently upserted into the database without
          creating duplicates.
        </p>

        <form
          onSubmit={handleTriggerSync}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              State Filter (Optional)
            </label>
            <input
              type="text"
              value={syncState}
              onChange={(e) => setSyncState(e.target.value)}
              placeholder="e.g. Maharashtra, Punjab"
              className="w-full py-1.5 px-3 bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--outline-focus)]"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Commodity Filter (Optional)
            </label>
            <input
              type="text"
              value={syncCommodity}
              onChange={(e) => setSyncCommodity(e.target.value)}
              placeholder="e.g. Onion, Wheat"
              className="w-full py-1.5 px-3 bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--outline-focus)]"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Admin Sync Key (If configured)
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Optional admin secret"
              className="w-full py-1.5 px-3 bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--outline-focus)]"
            />
          </div>

          <div className="sm:col-span-3 pt-2 flex items-center space-x-3">
            <button
              type="submit"
              disabled={isSyncing}
              className="px-4 py-2 border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center space-x-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span>
                {isSyncing ? "Synchronizing with OGD..." : "Run Sync Now"}
              </span>
            </button>

            {syncResult && (
              <span
                className={`text-xs font-mono ${syncResult.success ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
              >
                {syncResult.message}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Sync Audit Logs Table */}
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-page)] flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase text-[var(--text-secondary)]">
            Synchronization Audit Logs
          </span>
          <span className="text-xs font-mono text-[var(--text-secondary)]">
            Last {logs.length} runs
          </span>
        </div>

        {loadingLogs ? (
          <div className="p-6 text-center text-xs text-[var(--text-secondary)] font-mono">
            {t("sync.loadingLogs")}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
            {t("sync.noLogs")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border-color)] font-mono text-[var(--text-secondary)]">
                <tr>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Filter</th>
                  <th className="py-2.5 px-4 text-right">Fetched</th>
                  <th className="py-2.5 px-4 text-right">Inserted</th>
                  <th className="py-2.5 px-4 text-right">Updated</th>
                  <th className="py-2.5 px-4">Notes / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] font-mono">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-[var(--bg-page)]">
                    <td className="py-2.5 px-4">
                      {l.status === "SUCCESS" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>SUCCESS</span>
                        </span>
                      ) : l.status === "NOT_CONFIGURED" ? (
                        <span className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                          <Info className="w-3.5 h-3.5" />
                          <span>NOT CONFIGURED</span>
                        </span>
                      ) : l.status === "PARTIAL" ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>PARTIAL</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{l.status || "FAILED"}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {l.started_at.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-primary)]">
                      {l.state_filter || "ALL"}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[var(--text-secondary)]">
                      {l.records_fetched}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{l.records_inserted}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[var(--text-secondary)]">
                      {l.records_updated}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)] truncate max-w-xs">
                      {l.error_message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
