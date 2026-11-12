import React from "react";
import {
  Sun,
  Moon,
  Database,
  TrendingUp,
  Layers,
  RefreshCw,
  Calculator,
  Star,
  Menu,
  X,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.js";
import { siteNavigation } from "../siteNavigation.js";

interface HeaderProps {
  currentTab:
    "board" | "compare" | "trends" | "sync" | "calculator" | "watchlist";
  onTabChange: (
    tab: "board" | "compare" | "trends" | "sync" | "calculator" | "watchlist",
  ) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  totalRecords: number;
  lastSyncDate: string | null;
  onTriggerSyncClick: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  isDark,
  onToggleTheme,
  totalRecords,
  lastSyncDate,
  onTriggerSyncClick,
  isSyncing,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  return (
    <header className="min-w-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <img
              src="/Rate%20GPT%20Agritech%20Logo.png"
              alt="Rate GPT Agritech Logo"
              className="w-10 h-10 object-contain border border-[var(--border-color)] bg-[var(--bg-page)]"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Rate GPT
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[var(--border-color)] text-[var(--text-secondary)] uppercase">
                  {t("app.badge")}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] hidden sm:block">
                {t("app.subtitle")}
              </p>
            </div>
          </div>

          <nav
            aria-label="Site navigation"
            className="hidden lg:flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)]"
          >
            {siteNavigation.map(({ label, href }) => (
              <a
                className="whitespace-nowrap hover:text-[var(--text-primary)]"
                href={href}
                key={href}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Quick status & Theme toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden md:flex flex-col text-right text-xs">
              <span className="text-[var(--text-secondary)] font-mono">
                {totalRecords.toLocaleString()} {t("header.records")}
              </span>
              {lastSyncDate && (
                <span className="text-[var(--text-secondary)] text-[11px]">
                  {t("header.latestDate")}:{" "}
                  <strong className="text-[var(--text-primary)]">
                    {lastSyncDate}
                  </strong>
                </span>
              )}
            </div>

            {/* Quick Sync Button */}
            <button
              onClick={onTriggerSyncClick}
              disabled={isSyncing}
              title={t("header.sync")}
              aria-label={t("header.sync")}
              className="p-2 border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              aria-label={t("header.language")}
              title={t("header.language")}
              className="px-2 py-1 border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-medium transition-colors"
            >
              {language === "en" ? "हिंदी" : "English"}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              aria-label={
                isDark ? t("header.theme.dark") : t("header.theme.light")
              }
              title={isDark ? t("header.theme.dark") : t("header.theme.light")}
              className="p-2 border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] transition-colors focus:outline-2 focus:outline-[var(--outline-focus)]"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-site-navigation"
              aria-label={
                isMobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")
              }
              title={isMobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              className="p-2 border border-[var(--border-color)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] transition-colors lg:hidden"
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <nav
          id="mobile-site-navigation"
          aria-label="Site navigation"
          className={`${isMobileMenuOpen ? "grid" : "hidden"} lg:hidden grid-cols-2 sm:grid-cols-3 gap-3 border-t border-[var(--border-color)] py-3 text-xs font-medium text-[var(--text-secondary)]`}
        >
          {siteNavigation.map(({ label, href }) => (
            <a
              className="hover:text-[var(--text-primary)]"
              href={href}
              key={href}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Navigation Tabs */}
        <nav
          aria-label="Primary navigation"
          role="tablist"
          className="flex w-full min-w-0 space-x-1 sm:space-x-2 overflow-x-auto border-t border-[var(--border-color)] py-2 no-scrollbar text-xs sm:text-sm font-medium"
        >
          <button
            role="tab"
            aria-selected={currentTab === "board"}
            aria-controls="panel-board"
            onClick={() => onTabChange("board")}
            className={`px-3 py-1.5 border transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              currentTab === "board"
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t("nav.board")}</span>
          </button>

          <button
            role="tab"
            aria-selected={currentTab === "compare"}
            aria-controls="panel-compare"
            onClick={() => onTabChange("compare")}
            className={`px-3 py-1.5 border transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              currentTab === "compare"
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t("nav.compare")}</span>
          </button>

          <button
            role="tab"
            aria-selected={currentTab === "trends"}
            aria-controls="panel-trends"
            onClick={() => onTabChange("trends")}
            className={`px-3 py-1.5 border transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              currentTab === "trends"
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t("nav.trends")}</span>
          </button>

          <button
            role="tab"
            aria-selected={currentTab === "calculator"}
            aria-controls="panel-calculator"
            onClick={() => onTabChange("calculator")}
            className={`px-3 py-1.5 border transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              currentTab === "calculator"
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{t("nav.calculator")}</span>
          </button>

          <button
            role="tab"
            aria-selected={currentTab === "watchlist"}
            aria-controls="panel-watchlist"
            onClick={() => onTabChange("watchlist")}
            className={`px-3 py-1.5 border transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              currentTab === "watchlist"
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>{t("nav.watchlist")}</span>
          </button>

          <button
            role="tab"
            aria-selected={currentTab === "sync"}
            aria-controls="panel-sync"
            onClick={() => onTabChange("sync")}
            className={`px-3 py-1.5 border transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              currentTab === "sync"
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-page)]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("nav.sync")}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
