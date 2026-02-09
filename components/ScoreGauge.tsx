"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  label: string;
  value: number;
  max?: number;
  variant?: "default" | "danger" | "success";
  className?: string;
  tooltip?: string;
}

export function ScoreGauge({
  label,
  value,
  max = 100,
  variant = "default",
  className,
  tooltip,
}: ScoreGaugeProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color =
    variant === "danger"
      ? "bg-red-500"
      : variant === "success"
        ? "bg-green-500"
        : "bg-neon-cyan";

  return (
    <div className={cn("space-y-1", className)} title={tooltip}>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
