"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { AlertTriangle } from "lucide-react";

const ATTACK_TEMPLATES = [
  { id: "scam-email", name: "Convincing Scam Email", template: "A convincing phishing email requesting urgent account verification with a fake login link." },
  { id: "fake-news", name: "Fake Breaking News", template: "A fake breaking news article with sensational headline and unnamed sources." },
  { id: "edited-screenshot", name: "Edited Screenshot Story", template: "A narrative that could accompany edited or fabricated chat/social screenshots." },
  { id: "synthetic-voice", name: "Synthetic Voice Confession", template: "A short script that could be read by a synthetic voice for a fake confession or statement." },
];

export default function AdversarialPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ content: string; script?: string; warnings?: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const router = useRouter();

  const template = ATTACK_TEMPLATES.find((t) => t.id === selected)?.template;

  const generate = async () => {
    if (!template) return;
    setLoading(true);
    setGenerated(null);
    try {
      const res = await fetch("/api/adversarial/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const data = await res.json();
      if (res.ok && data?.content) {
        setGenerated({
          content: data.content,
          script: data.script,
          warnings: data.warnings ?? [],
        });
      } else {
        setGenerated({
          content: "[No API key] Use this placeholder: " + template,
          warnings: ["Configure GEMINI_API_KEY for generation."],
        });
      }
    } catch {
      setGenerated({
        content: "[Generation failed] " + template,
        warnings: ["Check API key and try again."],
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeAgainstEvidentia = async () => {
    if (!generated?.content) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: [{ type: "text", text: generated.content }],
          mode: "adversarial",
        }),
      });
      const data = await res.json();
      if (res.ok && data?.report) {
        try {
          if (typeof window !== "undefined") {
            const rid = `session-${Date.now().toString(36)}`;
            window.sessionStorage.setItem(`evidentia_report_${rid}`, JSON.stringify(data.report));
            window.sessionStorage.setItem("evidentia_report_local", JSON.stringify(data.report));
            const raw = window.sessionStorage.getItem("evidentia_recent_reports");
            const parsed = raw ? (JSON.parse(raw) as Array<{ id: string }>) : [];
            const next = [
              {
                id: rid,
                createdAt: Date.now(),
                verdict: data?.report?.verdict ?? data?.report?.executiveSummary?.verdict,
                confidence: data?.report?.confidence ?? data?.report?.executiveSummary?.confidence,
              },
              ...(Array.isArray(parsed) ? parsed.filter((r) => r?.id && r.id !== rid) : []),
            ].slice(0, 10);
            window.sessionStorage.setItem("evidentia_recent_reports", JSON.stringify(next));
            router.push(`/report/${rid}`);
            return;
          }
        } catch {}
        router.push(`/report/local`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-2xl font-bold mb-2">Adversarial Mode</h1>
        <p className="text-muted text-sm">
          Red-team the Truth Engine. Generate adversarial content and see if Evidentia flags it.
        </p>
      </motion.div>

      <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-8">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          For research and defense only. Do not use to harm or deceive. This mode is intended to improve detection.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <GlassCard className="p-4">
            <p className="text-sm font-medium text-muted mb-3">Attack templates</p>
            <ul className="space-y-2">
              {ATTACK_TEMPLATES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selected === t.id ? "bg-neon-cyan/20 text-neon-cyan" : "hover:bg-white/5"
                    }`}
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>

        <div className="lg:col-span-1">
          <GlassCard className="p-4">
            <p className="text-sm font-medium text-muted mb-3">Generate adversarial content</p>
            {template && (
              <p className="text-xs text-muted mb-3">{template}</p>
            )}
            <Button
              onClick={generate}
              disabled={!selected || loading}
              className="w-full"
            >
              {loading ? "Generating…" : "Generate"}
            </Button>
            {generated && (
              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                {generated.content}
              </div>
            )}
            {generated?.warnings?.length ? (
              <ul className="mt-2 text-xs text-amber-400">
                {generated.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </GlassCard>
        </div>

        <div className="lg:col-span-1">
          <GlassCard className="p-4">
            <p className="text-sm font-medium text-muted mb-3">Analyze against Evidentia</p>
            <Button
              variant="secondary"
              onClick={analyzeAgainstEvidentia}
              disabled={!generated?.content || analyzing}
              className="w-full"
            >
              {analyzing ? "Analyzing…" : "Run Truth Report"}
            </Button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
