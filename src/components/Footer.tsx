import React from "react";
import { useLanguage } from "../context/LanguageContext.js";
import { siteNavigation } from "../siteNavigation.js";

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer
      role="contentinfo"
      className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs text-[var(--text-secondary)] transition-colors"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <img
              src="/Rate%20GPT%20Agritech%20Logo.png"
              alt="Rate GPT Agritech Logo"
              className="w-6 h-6 object-contain"
            />
            <span className="font-bold text-sm text-[var(--text-primary)]">
              Rate GPT
            </span>
            <span className="font-mono text-[11px] border border-[var(--border-color)] px-1.5 py-0.5">
              Open Data Integration
            </span>
          </div>
          <p className="mt-1 max-w-xl text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {t("footer.source")} (Resource ID:{" "}
            <code className="font-mono text-[var(--text-primary)]">
              9ef84268-d588-465a-a308-a864a43d0070
            </code>
            ).
          </p>
          <a
            className="mt-2 inline-block text-[11px] hover:text-[var(--text-primary)]"
            href="https://data.gov.in/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Data source: data.gov.in
          </a>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-4 gap-y-2 md:max-w-sm"
        >
          {siteNavigation.map(({ label, href }) => (
            <a className="hover:text-[var(--text-primary)]" href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="max-w-md text-[11px] text-[var(--text-secondary)] space-y-1">
          <p>
            <strong className="text-[var(--text-primary)]">Disclaimer: </strong>
            {t("footer.disclaimer")}
          </p>
          <p>{t("footer.history")}</p>
        </div>
      </div>
    </footer>
  );
};
