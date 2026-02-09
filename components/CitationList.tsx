"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { Citation } from "@/lib/types";

interface CitationListProps {
  citations: Citation[];
  title?: string;
}

export function CitationList({ citations, title = "Sources" }: CitationListProps) {
  if (!citations?.length) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <ul className="space-y-2">
        {citations.map((c, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-lg p-3 border border-white/10"
          >
            <a
              href={c.link || c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan hover:underline flex items-start gap-2"
            >
              <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{c.title}</span>
            </a>
            <p className="text-xs text-muted mt-1 line-clamp-2">{c.snippet}</p>
            <span className="text-xs text-muted">{c.domain}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
