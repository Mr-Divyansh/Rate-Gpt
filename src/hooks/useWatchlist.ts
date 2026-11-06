export interface WatchlistItem {
  type: "commodity" | "market";
  key: string;
}

const STORAGE_KEY = "rategpt_watchlist";

function readWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: WatchlistItem[] = [];
    const seen = new Set<string>();
    for (const it of parsed) {
      if (!it || typeof it !== "object") continue;
      const type =
        it.type === "commodity" || it.type === "market" ? it.type : null;
      const key = typeof it.key === "string" ? it.key.trim() : "";
      if (!type || !key) continue;
      const id = `${type}:${key.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ type, key });
    }
    return out;
  } catch {
    return [];
  }
}

function writeWatchlist(items: WatchlistItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

import { useState, useCallback } from "react";

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>(() => readWatchlist());

  const add = useCallback((item: WatchlistItem) => {
    setItems((prev) => {
      if (
        prev.some(
          (i) =>
            i.type === item.type &&
            i.key.toLowerCase() === item.key.toLowerCase(),
        )
      )
        return prev;
      const next = [...prev, item];
      writeWatchlist(next);
      return next;
    });
  }, []);

  const remove = useCallback((item: WatchlistItem) => {
    setItems((prev) => {
      const next = prev.filter(
        (i) =>
          !(
            i.type === item.type &&
            i.key.toLowerCase() === item.key.toLowerCase()
          ),
      );
      writeWatchlist(next);
      return next;
    });
  }, []);

  const has = useCallback(
    (type: WatchlistItem["type"], key: string) => {
      return items.some(
        (i) => i.type === type && i.key.toLowerCase() === key.toLowerCase(),
      );
    },
    [items],
  );

  const toggle = useCallback((item: WatchlistItem) => {
    setItems((prev) => {
      const exists = prev.some(
        (i) =>
          i.type === item.type &&
          i.key.toLowerCase() === item.key.toLowerCase(),
      );
      const next = exists
        ? prev.filter(
            (i) =>
              !(
                i.type === item.type &&
                i.key.toLowerCase() === item.key.toLowerCase()
              ),
          )
        : [...prev, item];
      writeWatchlist(next);
      return next;
    });
  }, []);

  return { items, add, remove, has, toggle };
}
