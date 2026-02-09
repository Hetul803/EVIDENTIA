"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AnalysisStep } from "@/lib/types";

export function PipelineStepper({ steps }: { steps: AnalysisStep[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted mb-3">Analysis pipeline</p>
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3"
        >
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
              step.status === "done" && "bg-neon-cyan/20 text-neon-cyan",
              step.status === "active" && "bg-neon-cyan/30 text-neon-cyan ring-2 ring-neon-cyan/50 animate-pulse",
              step.status === "error" && "bg-red-500/20 text-red-400",
              step.status === "pending" && "bg-white/10 text-muted"
            )}
          >
            {step.status === "done" ? "✓" : i + 1}
          </div>
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              step.status === "active" && "text-neon-cyan"
            )}>
              {step.label}
            </p>
          </div>
          {step.status === "active" && (
            <div className="h-1 flex-1 max-w-[120px] rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-neon-cyan rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                style={{ width: "40%" }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
