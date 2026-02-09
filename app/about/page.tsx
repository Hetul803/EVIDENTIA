"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { SystemStatus } from "@/components/SystemStatus";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <h1 className="text-2xl font-bold">About Evidentia</h1>
        <SystemStatus />
        <GlassCard className="p-6 space-y-4">
          <p className="text-foreground">
            Evidentia is a multi-modal Truth Engine that analyzes uploaded evidence (text, links, PDFs, images, audio, video) and produces a structured Truth Report—not a chat. It extracts claims, checks cross-modal consistency, flags manipulation and deepfake likelihood, detects bias and persuasion, reconstructs timelines, and (when configured) verifies against external sources with citations.
          </p>
          <p className="text-muted text-sm">
            Privacy-first: evidence and reports are stored only in your browser session and are cleared on refresh.
          </p>
          <p className="text-muted text-sm">
            This is decision support infrastructure. It is not legal, medical, or professional advice. Always verify critical claims through official channels.
          </p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="font-semibold mb-2">Safety notes</h2>
          <ul className="text-sm text-muted space-y-2 list-disc pl-4">
            <li>Reports are probabilistic and heuristic-based; they are not court-grade evidence.</li>
            <li>Adversarial mode is for research and improving defenses only.</li>
            <li>Do not rely solely on Evidentia for high-stakes decisions.</li>
          </ul>
        </GlassCard>
      </motion.div>
    </div>
  );
}
