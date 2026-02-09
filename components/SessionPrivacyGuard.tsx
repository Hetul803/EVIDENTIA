"use client";

import { useEffect } from "react";

export function SessionPrivacyGuard() {
  useEffect(() => {
    try {
      const key = "evidentia_session_started";
      const started = window.sessionStorage.getItem(key);

      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const isReload = nav?.type === "reload";

      if (!started || isReload) {
        window.sessionStorage.clear();
        window.sessionStorage.setItem(key, String(Date.now()));
      }
    } catch {
      // ignore
    }
  }, []);

  return null;
}
