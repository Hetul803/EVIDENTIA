"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "@/components/ScoreGauge";
import { ReportSection } from "@/components/ReportSection";
import { CitationList } from "@/components/CitationList";
import { TimelineBar } from "@/components/TimelineBar";
import { GlassCard } from "@/components/GlassCard";
import { normalizeReport, deriveKeyFindings } from "@/lib/report-normalizer";
import type { TruthReport, FlaggedSegment } from "@/lib/types";
import { X } from "lucide-react";

const SCORE_TOOLTIPS: Record<string, string> = {
  Consistency: "How much the evidence agrees across sources; higher is more consistent.",
  "Manipulation risk": "Likelihood that content was AI-generated or manipulated.",
  Bias: "Detected bias in language or one-sided presentation.",
  "Scam risk": "Indicators of scam or social engineering; higher means more caution.",
  "Timeline confidence": "How reliable the reconstructed timeline is.",
  "AI likelihood": "Overall likelihood that content is AI-generated or synthetic.",
};

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [report, setReport] = useState<TruthReport | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyDone, setCopyDone] = useState(false);
  const localLoadedRef = useRef(false);
  const pdfRootRef = useRef<HTMLDivElement>(null);
  const autoPrintedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      if (id.startsWith("session-")) {
        if (localLoadedRef.current) return;
        const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(`evidentia_report_${id}`) : null;
        if (!raw) throw new Error("Not found");
        const parsed = JSON.parse(raw);
        setReport(normalizeReport(parsed));
        setShareId(null);
        localLoadedRef.current = true;
        return;
      }
      if (id === "local") {
        if (localLoadedRef.current) return;
        const raw = typeof window !== "undefined" ? window.sessionStorage.getItem("evidentia_report_local") : null;
        if (!raw) throw new Error("Not found");
        const parsed = JSON.parse(raw);
        setReport(normalizeReport(parsed));
        setShareId(null);
        localLoadedRef.current = true;
        return;
      }
      const res = await fetch(`/api/report/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setReport(normalizeReport(data.report));
      setShareId(data.shareId);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const copyShareLink = () => {
    if (!shareId) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/report/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const downloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `evidentia-report-${id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pdfTitle = useMemo(() => {
    const safeId = (id ?? "report").slice(0, 8);
    return `Evidentia Truth Report (${safeId})`;
  }, [id]);

  const downloadPdf = useCallback(() => {
    if (!report) return;
    const html = pdfRootRef.current?.innerHTML;
    if (!html) return;

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;

    w.document.open();
    w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${pdfTitle}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; color: #0b1220; }
      h1, h2, h3 { margin: 0 0 10px; }
      p { margin: 0 0 10px; line-height: 1.35; }
      .muted { color: #475569; }
      .chip { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eef2ff; border: 1px solid #e2e8f0; font-weight: 600; }
      .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; margin: 12px 0; }
      ul { margin: 0; padding-left: 18px; }
      li { margin: 6px 0; }
      a { color: #1d4ed8; text-decoration: none; }
      .no-print { display: none !important; }
      @page { margin: 14mm; }
      @media print {
        body { margin: 0; }
        a { color: #000; }
      }
    </style>
  </head>
  <body>
    ${html}
    <script>
      window.onload = () => {
        setTimeout(() => window.print(), 50);
      };
    </script>
  </body>
</html>`);
    w.document.close();
  }, [report, pdfTitle]);

  useEffect(() => {
    const shouldPrint = searchParams.get("print") === "1";
    if (!shouldPrint) return;
    if (!report || loading) return;
    if (autoPrintedRef.current) return;
    autoPrintedRef.current = true;
    downloadPdf();
  }, [searchParams, report, loading, downloadPdf]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-muted">
        Loading report…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-muted mb-4">Report not found.</p>
        <Link href="/"><Button>Go home</Button></Link>
      </div>
    );
  }

  const r = report;
  const verdict = r.verdict ?? r.executiveSummary.verdict;
  const confidence = r.confidence ?? r.executiveSummary.confidence;
  const scores = r.scores ?? {
    consistency: r.crossModalConsistency?.consistencyScore ?? 0,
    manipulationRisk: r.manipulationLikelihood?.aiGeneratedScore ?? 0,
    bias: r.biasPersuasion?.biasScore ?? 0,
    scamRisk: r.biasPersuasion?.scamRiskScore ?? 0,
    timelineConfidence: r.timeline?.timelineConfidence ?? 0,
    aiLikelihood: r.aiAnalysis?.overallLikelihood ?? r.manipulationLikelihood?.aiGeneratedScore ?? 0,
  };
  const aiAnalysis = r.aiAnalysis ?? {
    overallLikelihood: r.manipulationLikelihood?.aiGeneratedScore ?? 0,
    breakdownByModality: {},
    flaggedSegments: [],
    signals: r.manipulationLikelihood?.signals ?? [],
  };
  const claims = r.claims ?? r.claimsDetected ?? [];
  const contradictions = r.contradictions ?? r.crossModalConsistency?.contradictions ?? [];
  const evidenceLedger = r.evidenceLedger ?? [];
  const timelineEvents = r.timeline?.events ?? [];
  const extVerif = r.externalVerification;
  const keyFindings = deriveKeyFindings(r);

  const perClaim = (extVerif?.perClaim ?? extVerif?.claimVerifications ?? []) as Array<{ status?: string; citations?: unknown[] }>;
  const supportedCount = perClaim.filter((c) => c.status === "Supported").length;
  const disputedCount = perClaim.filter((c) => c.status === "Disputed").length;
  const notFoundCount = perClaim.filter((c) => c.status === "NotFound" || c.status === "Not found").length;

  const verdictColor =
    verdict === "Likely True" ? "text-green-400" :
    verdict === "Manipulated/Deceptive" || verdict === "Likely False" ? "text-red-400" :
    "text-amber-400";

  const videoAudioSegments = (aiAnalysis.flaggedSegments ?? []).filter(
    (s): s is FlaggedSegment & { modality: "video" | "audio"; startSec: number; endSec: number } =>
      (s.modality === "video" || s.modality === "audio") && "startSec" in s && "endSec" in s
  );
  const maxSec = videoAudioSegments.length ? Math.max(...videoAudioSegments.map((s) => s.endSec)) : 100;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Truth Report</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/analyze")}
              title="Close"
              className="no-print"
            >
              <X className="w-4 h-4" />
            </Button>
            {shareId ? (
              <Button variant="secondary" size="sm" onClick={copyShareLink}>
                {copyDone ? "Copied!" : "Copy share link"}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={downloadJson}>Download JSON</Button>
            <Button variant="ghost" size="sm" onClick={downloadPdf} title="Opens the print dialog (save as PDF)">Download PDF</Button>
          </div>
        </div>

        <div ref={pdfRootRef}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-stretch gap-4"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`px-5 py-3 rounded-xl font-bold text-lg ${verdictColor} bg-white/5 border border-white/10`}>
              {verdict}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Confidence</span>
              <ScoreGauge label="" value={confidence} className="w-28" tooltip="Overall confidence in this report (0–100)." />
            </div>
          </div>
          <GlassCard className="p-4 flex-1 min-w-[200px]">
            <p className="text-xs text-muted mb-2">AI Generation Likelihood</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-2xl font-bold text-neon-cyan">{aiAnalysis.overallLikelihood}%</div>
              <div className="flex flex-wrap gap-2">
                {["text", "image", "audio", "video", "pdf", "link"].map((mod) => {
                  const v = aiAnalysis.breakdownByModality?.[mod as keyof typeof aiAnalysis.breakdownByModality] ?? 0;
                  return (
                    <div key={mod} className="flex items-center gap-1.5">
                      <span className="text-xs text-muted capitalize">{mod}</span>
                      <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full bg-neon-violet rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${v}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          <ScoreGauge label="Consistency" value={scores.consistency} variant="success" tooltip={SCORE_TOOLTIPS.Consistency} />
          <ScoreGauge label="Manipulation risk" value={scores.manipulationRisk} variant="danger" tooltip={SCORE_TOOLTIPS["Manipulation risk"]} />
          <ScoreGauge label="Bias" value={scores.bias} tooltip={SCORE_TOOLTIPS.Bias} />
          <ScoreGauge label="Scam risk" value={scores.scamRisk} variant="danger" tooltip={SCORE_TOOLTIPS["Scam risk"]} />
          <ScoreGauge label="Timeline conf." value={scores.timelineConfidence} tooltip={SCORE_TOOLTIPS["Timeline confidence"]} />
          <ScoreGauge label="AI likelihood" value={scores.aiLikelihood} variant="danger" tooltip={SCORE_TOOLTIPS["AI likelihood"]} />
        </motion.div>

        {keyFindings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-4 rounded-xl"
          >
            <p className="text-sm font-medium text-muted mb-2">Key findings</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 list-disc list-inside text-sm text-foreground">
              {keyFindings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </motion.div>
        )}

        <ReportSection title="Executive summary" defaultOpen>
          <ul className="list-disc pl-4 space-y-1">
            <li className="font-medium text-foreground">Why: {(r.executiveSummary.why ?? []).join(" ")}</li>
            <li>What to do next: {(r.executiveSummary.nextSteps ?? r.executiveSummary.whatToDoNext ?? []).join(" ")}</li>
          </ul>
        </ReportSection>

        <ReportSection title="Claims detected">
          <ul className="space-y-2">
            {claims.map((c, i) => (
              <li key={c.id ?? i} id={`claim-${c.id ?? i}`} className="border-l-2 border-neon-cyan/50 pl-3 py-1">
                <p className="text-foreground">{c.text}</p>
                <p className="text-xs text-muted">{c.category} · {c.importance}</p>
                {Array.isArray((c as { sourceEvidenceIds?: string[] }).sourceEvidenceIds) && (c as { sourceEvidenceIds?: string[] }).sourceEvidenceIds!.length > 0 ? (
                  <p className="text-[11px] text-muted mt-1">Evidence: {(c as { sourceEvidenceIds?: string[] }).sourceEvidenceIds!.join(", ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </ReportSection>

        {contradictions.length > 0 && (
          <ReportSection title="Contradictions" defaultOpen>
            <div className="space-y-4">
              {contradictions.map((c, i) => (
                <GlassCard key={i} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.severity === "high" ? "bg-red-500/20 text-red-400" :
                      c.severity === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-muted"
                    }`}>
                      {(c.severity ?? "medium").toUpperCase()}
                    </span>
                    {c.claimId && (
                      <a href={`#claim-${c.claimId}`} className="text-xs text-neon-cyan hover:underline">Claim {c.claimId}</a>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <p className="text-xs text-muted mb-1">Source A</p>
                      <p className="text-sm font-medium">{c.a?.source ?? c.evidenceA}</p>
                      <p className="text-xs text-muted">{c.a?.detail}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs text-muted mb-1">Source B</p>
                      <p className="text-sm font-medium">{c.b?.source ?? c.evidenceB}</p>
                      <p className="text-xs text-muted">{c.b?.detail}</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground">{c.explanation ?? c.description}</p>
                </GlassCard>
              ))}
            </div>
          </ReportSection>
        )}

        <ReportSection title="Evidence ledger">
          <ul className="space-y-4">
            {evidenceLedger.map((e, i) => (
              <li key={e.id ?? i} className="glass-card p-4 rounded-xl border border-white/10">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-medium text-foreground">{e.name ?? e.filename ?? e.url ?? `Evidence ${i + 1}`}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted capitalize">{e.type}</span>
                  {e.createdAt && <span className="text-xs text-muted">{e.createdAt}</span>}
                </div>
                {(e.extractedFacts ?? e.keyFacts)?.length ? (
                  <ul className="list-disc pl-4 text-sm text-muted mb-2">
                    {(e.extractedFacts ?? e.keyFacts).map((f, j) => (
                      <li key={j}>{f}</li>
                    ))}
                  </ul>
                ) : null}
                {e.extractedTextPreview && (
                  <pre className="text-xs bg-black/20 rounded p-3 overflow-x-auto max-h-24 overflow-y-auto font-mono text-muted">
                    {e.extractedTextPreview}
                  </pre>
                )}
                {e.metadata && Object.keys(e.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted cursor-pointer">Metadata</summary>
                    <pre className="text-xs bg-black/20 rounded p-2 mt-1 overflow-x-auto font-mono text-muted">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </ReportSection>

        {(aiAnalysis.flaggedSegments?.length ?? 0) > 0 && (
          <ReportSection title="Which parts are AI / manipulated" defaultOpen>
            {videoAudioSegments.length > 0 && (
              <div className="mb-4">
                <TimelineBar duration={maxSec} segments={videoAudioSegments.map((s) => ({ start: s.startSec, end: s.endSec, reason: s.reason }))} />
                <ul className="mt-3 space-y-1 text-xs">
                  {aiAnalysis.flaggedSegments.map((s, i) => (
                    <li key={i}>
                      {(s as FlaggedSegment & { modality: string }).modality}: {s.reason}
                      {"confidence" in s && ` (${s.confidence}%)`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiAnalysis.flaggedSegments.filter((s) => s.modality === "text").length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted">Flagged text snippets</p>
                {(aiAnalysis.flaggedSegments as FlaggedSegment[]).filter((s) => s.modality === "text").map((s, i) => (
                  <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-foreground">&quot;{s.modality === "text" ? s.snippet : ""}&quot;</p>
                    <p className="text-xs text-muted">{s.reason}</p>
                  </div>
                ))}
              </div>
            )}
            {aiAnalysis.flaggedSegments.filter((s) => s.modality === "image").length > 0 && (
              <ul className="text-sm space-y-1">
                {(aiAnalysis.flaggedSegments as FlaggedSegment[]).filter((s) => s.modality === "image").map((s, i) => (
                  <li key={i}>Region: {s.modality === "image" ? s.regionHint : ""} — {s.reason}</li>
                ))}
              </ul>
            )}
          </ReportSection>
        )}

        <ReportSection title="Bias & persuasion">
          <p>{r.biasPersuasion.explanation}</p>
          <ul className="list-disc pl-4 mt-2 text-xs">
            {r.biasPersuasion.persuasionTactics.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="Timeline">
          <p className="text-xs text-muted mb-2">Timeline confidence: {r.timeline?.timelineConfidence ?? r.timeline?.confidence ?? 0}%</p>
          {timelineEvents.length === 0 ? (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-muted">
              No explicit timeline could be inferred from the submitted evidence. This is common for single pasted texts.
            </div>
          ) : timelineEvents.length === 1 ? (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-muted mb-1">Single event</p>
              <p className="text-sm"><span className="text-neon-cyan">{timelineEvents[0].t ?? timelineEvents[0].time}</span> — {timelineEvents[0].label ?? timelineEvents[0].description}</p>
              {timelineEvents[0].inferred ? (
                <p className="text-xs text-amber-300/80 mt-2">Inferred: timeline is reconstructed from evidence order, not explicit timestamps.</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex overflow-x-auto pb-4 gap-4 items-start">
                {timelineEvents.map((ev, i) => (
                  <div key={i} className="flex items-center shrink-0">
                    <div className={`w-3 h-3 rounded-full ${ev.inferred ? "border-2 border-dashed border-amber-400 bg-transparent" : "bg-neon-cyan"}`} />
                    <div className="ml-2 min-w-[120px]">
                      <p className="text-xs text-neon-cyan">{ev.t ?? ev.time ?? ""}</p>
                      <p className="text-sm">{ev.label ?? ev.description ?? ""}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ul className="space-y-1 mt-4 text-sm">
                {timelineEvents.map((ev, i) => (
                  <li key={i}><span className="text-neon-cyan">{ev.t ?? ev.time}</span> — {ev.label ?? ev.description}</li>
                ))}
              </ul>
            </>
          )}
        </ReportSection>

        <ReportSection title="External verification" defaultOpen>
          {extVerif?.unavailable || !extVerif?.enabled ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
              External verification unavailable. Configure SEARCH_API_KEY for citations. Confidence may be reduced for unverified claims.
            </div>
          ) : null}
          {extVerif?.enabled ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-300">Supported: {supportedCount}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-300">Disputed: {disputedCount}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted">Not found: {notFoundCount}</span>
            </div>
          ) : null}
          <p className="text-xs text-muted mb-2">{extVerif?.reliabilityNote ?? extVerif?.sourceReliabilityNote}</p>
          {(extVerif?.perClaim ?? extVerif?.claimVerifications ?? []).map((cv, i) => {
            const claim = claims.find((c) => (c.id ?? `c${i}`) === (cv.claimId ?? `c${i}`));
            const status = cv.status === "Not found" ? "NotFound" : cv.status;
            return (
              <div key={i} className="mb-4">
                <p className="text-sm font-medium">{claim?.text ?? `Claim ${cv.claimId ?? i + 1}`}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  status === "Supported" ? "bg-green-500/20 text-green-400" :
                  status === "Disputed" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-muted"
                }`}>
                  {status}
                </span>
                {(cv as { notes?: string }).notes ? (
                  <p className="text-xs text-muted mt-1">{(cv as { notes?: string }).notes}</p>
                ) : null}
                <CitationList citations={cv.citations ?? []} title="" />
              </div>
            );
          })}
        </ReportSection>

        {r.reportError?.code === "gemini_error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-sm"
          >
            <strong>Gemini call failed:</strong> {r.reportError.message}
            {r.reportError.statusCode != null && (
              <span className="ml-2 text-red-300/80">(Status: {r.reportError.statusCode})</span>
            )}
          </motion.div>
        )}
        {r.reportError?.code === "missing_key" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-white/5 border border-amber-500/30 text-amber-200/90 text-sm"
          >
            This report was generated in demo mode. Add GEMINI_API_KEY in .env for full analysis.
          </motion.div>
        )}
        {r.reportSource === "demo" && !r.reportError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-muted text-sm"
          >
            Demo mode — preloaded scenario result.
          </motion.div>
        )}

        <ReportSection title="Transparency & limitations">
          <p className="text-xs text-muted mb-2">{r.transparency?.safetyNote ?? "This report is for decision support only. It is not legal, medical, or professional advice."}</p>
          <p>What was analyzed: {(r.transparency?.analyzed ?? r.transparency?.whatWasAnalyzed ?? []).join("; ")}</p>
          <p className="mt-2">Limitations: {r.transparency?.limitations?.join("; ")}</p>
        </ReportSection>
        </div>
      </motion.div>
    </div>
  );
}
