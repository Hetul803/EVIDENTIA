"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";

interface Status {
  gemini: "configured" | "not_configured";
  search: "configured" | "not_configured";
}

export default function DemoPage() {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setStatus(s as Status))
      .catch(() => setStatus({ gemini: "not_configured", search: "not_configured" }));
  }, []);

  const allowed = status?.gemini !== "configured";

  if (status && !allowed) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-muted mb-4">Demo is only available when Gemini is not configured.</p>
        <Link href="/analyze"><Button>Go to Analyze</Button></Link>
      </div>
    );
  }

  const runScenario = async (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;
    setRunning(scenarioId);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: scenario.payload,
          mode: "demo",
          scenarioId: scenario.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      router.push(`/report/${data.reportId}`);
    } catch (e) {
      console.error(e);
      setRunning(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-2xl font-bold mb-2">Demo Mode</h1>
        <p className="text-muted text-sm">
          One-click analysis with preloaded scenarios. No API keys required for seeded reports.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {DEMO_SCENARIOS.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="p-6 flex flex-col h-full">
              <h2 className="font-semibold text-lg mb-2">{s.name}</h2>
              <p className="text-sm text-muted flex-1 mb-4">{s.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {s.tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted">
                    {t}
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => runScenario(s.id)}
                disabled={running !== null}
              >
                {running === s.id ? "Analyzing…" : "Run analysis"}
              </Button>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10"
      >
        <GlassCard className="p-6 border-neon-violet/30">
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <span className="text-neon-violet">Meta Demo</span>
          </h2>
          <p className="text-sm text-muted mb-4">
            Upload your hackathon demo video. Evidentia will analyze it and identify segments likely AI-generated (e.g. narration) vs real UI capture.
          </p>
          <Link href="/analyze?meta=1">
            <Button variant="secondary">
              Go to Analyze and upload demo video
            </Button>
          </Link>
        </GlassCard>
      </motion.div>
    </div>
  );
}
