"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FileText, Link, Image, File, Music, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/lib/types";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  link: Link,
  pdf: File,
  image: Image,
  audio: Music,
  video: Video,
};

export function EvidenceQueue({
  items,
  onRemove,
}: {
  items: EvidenceItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted mb-2">Evidence queue</p>
      <AnimatePresence>
        {items.length === 0 ? (
          <p className="text-sm text-muted">No evidence added yet.</p>
        ) : (
          items.map((item) => {
            const Icon = typeIcons[item.type] ?? FileText;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "glass-card p-3 flex items-center gap-3 rounded-xl",
                  item.status === "error" && "border-red-500/30"
                )}
              >
                <Icon className="w-5 h-5 text-neon-cyan shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {item.filename ?? item.url ?? "Pasted text"}
                  </p>
                  <p className="text-xs text-muted capitalize">{item.type}</p>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    item.status === "done" && "bg-green-500/20 text-green-400",
                    item.status === "error" && "bg-red-500/20 text-red-400",
                    item.status === "pending" && "bg-white/10 text-muted",
                    (item.status === "ingesting" || item.status === "extracting") && "bg-neon-cyan/20 text-neon-cyan"
                  )}
                >
                  {item.status}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="p-1 rounded hover:bg-white/10 text-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
