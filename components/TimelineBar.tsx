"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FlaggedSegment {
  start: number;
  end: number;
  reason?: string;
}

interface TimelineBarProps {
  duration?: number; // total seconds
  segments: FlaggedSegment[];
  className?: string;
}

export function TimelineBar({
  duration = 100,
  segments,
  className,
}: TimelineBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted">Flagged segments (e.g. AI / manipulated)</p>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
        {segments.length === 0 ? (
          <div className="flex-1 bg-white/5" />
        ) : (
          segments
            .sort((a, b) => a.start - b.start)
            .map((seg, i) => {
              const left = (seg.start / duration) * 100;
              const width = ((seg.end - seg.start) / duration) * 100;
              return (
                <motion.div
                  key={i}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: `${width}%`, opacity: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  className="bg-red-500/60 shrink-0 rounded"
                  style={{ marginLeft: i === 0 ? `${left}%` : 0 }}
                  title={seg.reason}
                />
              );
            })
        )}
      </div>
    </div>
  );
}
