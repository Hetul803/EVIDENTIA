"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";

interface Status {
  gemini: "configured" | "not_configured";
  search: "configured" | "not_configured";
}

export function SystemStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ gemini: "not_configured", search: "not_configured" }));
  }, []);

  if (!status) return null;

  const modeLabel =
    status.gemini === "configured"
      ? "Live (Gemini configured — analysis from Home/Analyze uses real AI)"
      : "Demo (add GEMINI_API_KEY for live analysis)";

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">System status</h3>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="text-muted">Gemini:</span>
          <span className={status.gemini === "configured" ? "text-green-400" : "text-amber-400"}>
            {status.gemini === "configured" ? "Configured" : "Not configured"}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="text-muted">Search:</span>
          <span className={status.search === "configured" ? "text-green-400" : "text-amber-400"}>
            {status.search === "configured" ? "Configured" : "Not configured"}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="text-muted">Current mode:</span>
          <span className="text-foreground">{modeLabel}</span>
        </li>
      </ul>
    </GlassCard>
  );
}
