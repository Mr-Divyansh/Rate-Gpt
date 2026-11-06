import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { LanguageProvider } from "./context/LanguageContext.js";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<div style="padding:2rem;font-family:system-ui">Root element not found. Please reload.</div>';
} else {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>,
  );
}
