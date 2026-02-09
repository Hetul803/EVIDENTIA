"use client";

import { useCallback, useRef, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { EvidenceQueue } from "@/components/EvidenceQueue";
import { PipelineStepper } from "@/components/PipelineStepper";
import { useAnalyzeStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast-provider";
import { SystemStatus } from "@/components/SystemStatus";
import { FileText, Link as LinkIcon, Image, File, Music, Video } from "lucide-react";

const STEP_ORDER = ["ingest", "claims", "crosscheck", "manipulation", "external", "report"];

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  link: LinkIcon,
  pdf: File,
  image: Image,
  audio: Music,
  video: Video,
};

type RecentReportItem = {
  id: string;
  createdAt: number;
  verdict?: string;
  confidence?: number;
};

function loadRecentReports(): RecentReportItem[] {
  try {
    const raw = window.sessionStorage.getItem("evidentia_recent_reports");
    const parsed = raw ? (JSON.parse(raw) as RecentReportItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentReports(items: RecentReportItem[]) {
  try {
    window.sessionStorage.setItem("evidentia_recent_reports", JSON.stringify(items.slice(0, 10)));
  } catch {
    // ignore
  }
}

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMetaDemo = searchParams.get("meta") === "1";
  const [findingMessage, setFindingMessage] = useState("");
  const [recentReports, setRecentReports] = useState<RecentReportItem[]>([]);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const stepTimersRef = useRef<number[]>([]);
  const viewReportRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const {
    evidenceQueue,
    steps,
    findings,
    reportId,
    isAnalyzing,
    removeEvidence,
    setStepStatus,
    addFinding,
    setReportId,
    setAnalyzing,
  } = useAnalyzeStore();

  useEffect(() => {
    try {
      setRecentReports(loadRecentReports());
    } catch {
      setRecentReports([]);
    }
  }, []);

  const downloadRecentJson = useCallback((rid: string) => {
    try {
      const raw = window.sessionStorage.getItem(`evidentia_report_${rid}`);
      if (!raw) return;
      const blob = new Blob([JSON.stringify(JSON.parse(raw), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `evidentia-report-${rid.slice(0, 12)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (reportId) {
      viewReportRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [reportId]);

  useEffect(() => {
    if (isAnalyzing && evidenceQueue.length === 0 && abortRef.current) {
      abortRef.current.abort();
      stepTimersRef.current.forEach((t) => clearTimeout(t));
      stepTimersRef.current = [];
      STEP_ORDER.forEach((id) => setStepStatus(id, "pending"));
      setAnalyzing(false);
      setFindingMessage("Stopped (no evidence).");
      toast("Analysis stopped (no evidence).", "default");
      abortRef.current = null;
    }
  }, [evidenceQueue.length, isAnalyzing, setAnalyzing, setStepStatus, toast]);

  const runAnalysis = useCallback(async () => {
    if (evidenceQueue.length === 0) return;
    abortRef.current = new AbortController();
    setAnalyzing(true);
    setFindingMessage("Preparing...");
    stepTimersRef.current.forEach((t) => clearTimeout(t));
    stepTimersRef.current = [];
    const inputs = evidenceQueue.map((e) => ({
      type: e.type,
      uploadKey: e.uploadKey,
      url: e.url,
      text: e.text,
    }));
    const mode = isMetaDemo ? "demo" : "normal";
    const scenarioId = isMetaDemo ? "meta-demo" : undefined;

    STEP_ORDER.forEach((id, i) => {
      const t = window.setTimeout(() => {
        if (abortRef.current?.signal.aborted) return;
        setStepStatus(id, "active");
        setFindingMessage(
          id === "ingest" ? "Ingesting evidence..." :
          id === "claims" ? "Extracting claims..." :
          id === "crosscheck" ? "Cross-checking..." :
          id === "manipulation" ? "Checking manipulation signals..." :
          id === "external" ? "External verification..." :
          "Building report..."
        );
      }, i * 1500);
      stepTimersRef.current.push(t);
    });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, mode, scenarioId }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Analysis failed");

      setStepStatus("report", "done");
      STEP_ORDER.forEach((id) => setStepStatus(id, "done"));
      addFinding("Report ready.", "report");
      const rid = `session-${Date.now().toString(36)}`;
      setReportId(rid);
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(`evidentia_report_${rid}`, JSON.stringify(data.report ?? null));
          window.sessionStorage.setItem("evidentia_report_local", JSON.stringify(data.report ?? null));

          const next: RecentReportItem[] = [
            {
              id: rid,
              createdAt: Date.now(),
              verdict: data?.report?.verdict ?? data?.report?.executiveSummary?.verdict,
              confidence: data?.report?.confidence ?? data?.report?.executiveSummary?.confidence,
            },
            ...loadRecentReports().filter((r) => r.id !== rid),
          ];
          saveRecentReports(next);
          setRecentReports(next);
        }
      } catch {}
      setFindingMessage("Done. View your report.");
      toast("Report ready.", "success");
      router.push(`/report/${rid}`);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setFindingMessage(msg);
      toast(msg, "error");
      STEP_ORDER.forEach((id) => setStepStatus(id, "error"));
    } finally {
      setAnalyzing(false);
      abortRef.current = null;
      stepTimersRef.current.forEach((t) => clearTimeout(t));
      stepTimersRef.current = [];
    }
  }, [evidenceQueue, isMetaDemo, setStepStatus, addFinding, setReportId, setAnalyzing, router, toast]);

  const stopAnalysis = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      stepTimersRef.current.forEach((t) => clearTimeout(t));
      stepTimersRef.current = [];
      STEP_ORDER.forEach((id) => setStepStatus(id, "pending"));
      setAnalyzing(false);
      setFindingMessage("Stopped.");
      toast("Analysis stopped.", "default");
      setShowStopConfirm(false);
      abortRef.current = null;
    }
  }, [setAnalyzing, setStepStatus, toast]);

  const reRunAnalysis = useCallback(() => {
    setReportId(null);
    STEP_ORDER.forEach((id) => setStepStatus(id, "pending"));
    runAnalysis();
  }, [setReportId, setStepStatus, runAnalysis]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold mb-2">Analysis workspace</h1>
        <p className="text-muted text-sm">
          Evidence is analyzed through the pipeline. Start when ready.
          {isMetaDemo && " (Meta Demo: upload your demo video to see AI vs real segments.)"}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <SystemStatus />
          <EvidenceQueue items={evidenceQueue} onRemove={removeEvidence} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">Add more evidence</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setShowEvidenceModal(true)}>
              Evidence timeline
            </Button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <PipelineStepper steps={steps} />
          <div className="mt-6 space-y-2">
            <Button
              size="lg"
              onClick={() => runAnalysis()}
              disabled={evidenceQueue.length === 0 || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? "Analyzing…" : "Start analysis"}
            </Button>
            {isAnalyzing && (
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                onClick={() => setShowStopConfirm(true)}
              >
                Stop analysis
              </Button>
            )}
            {reportId && !isAnalyzing && (
              <Button variant="secondary" size="sm" className="w-full" onClick={reRunAnalysis}>
                Re-run analysis
              </Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="glass-card p-4 rounded-xl">
            <p className="text-sm font-medium text-muted mb-2">Live findings</p>
            <p className="text-sm text-neon-cyan mb-2">{findingMessage}</p>
            <ul className="space-y-1 text-xs text-muted max-h-48 overflow-y-auto">
              {findings.slice(-8).reverse().map((f) => (
                <li key={f.id}>{f.text}</li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-4 rounded-xl mt-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-muted">Recent reports (this session)</p>
              {recentReports.length ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    try {
                      window.sessionStorage.removeItem("evidentia_recent_reports");
                      setRecentReports([]);
                    } catch {}
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            {recentReports.length === 0 ? (
              <p className="text-xs text-muted">No reports yet. Run an analysis to generate one.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentReports.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/report/${r.id}`)}
                      className="text-left min-w-0 flex-1 hover:underline"
                      title={r.id}
                    >
                      <div className="truncate text-foreground">{r.verdict ?? "Truth Report"}</div>
                      <div className="text-muted truncate">{new Date(r.createdAt).toLocaleTimeString()} · {typeof r.confidence === "number" ? `Conf ${r.confidence}%` : ""}</div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => downloadRecentJson(r.id)} title="Download JSON">JSON</Button>
                      <Link href={`/report/${r.id}?print=1`} target="_blank" className="no-print">
                        <Button variant="ghost" size="sm" title="Open print dialog (save as PDF)">PDF</Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-muted mt-3">Refreshing the page clears recent reports (privacy-first).</p>
          </div>
        </div>
      </div>

      {reportId && (
        <motion.div
          ref={viewReportRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <motion.span
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: 3, duration: 0.8 }}
            className="inline-block"
          >
            <Link href={`/report/${reportId}`}>
              <Button variant="secondary" size="lg">View Truth Report</Button>
            </Link>
          </motion.span>
        </motion.div>
      )}

      <Dialog.Root open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass-card p-6 rounded-2xl max-w-sm">
            <Dialog.Title className="font-semibold text-lg mb-2">Stop analysis?</Dialog.Title>
            <p className="text-sm text-muted mb-4">Progress will be lost. You can start again after stopping.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowStopConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={stopAnalysis}>Stop</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={showEvidenceModal} onOpenChange={setShowEvidenceModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass-card p-6 rounded-2xl max-w-lg max-h-[80vh] overflow-y-auto">
            <Dialog.Title className="font-semibold text-lg mb-2">Evidence timeline</Dialog.Title>
            <p className="text-sm text-muted mb-4">Items in upload order. Used in the final report when analysis runs.</p>
            <ul className="space-y-3">
              {evidenceQueue.length === 0 ? (
                <li className="text-sm text-muted">No evidence added yet.</li>
              ) : (
                evidenceQueue.map((e, i) => {
                  const Icon = typeIcons[e.type] ?? FileText;
                  return (
                    <li key={e.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-xs text-muted w-6">{i + 1}</span>
                      <Icon className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.filename ?? e.url ?? "Pasted text"}</p>
                        <p className="text-xs text-muted capitalize">{e.type}</p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setShowEvidenceModal(false)}>Close</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-6 py-10 text-muted">Loading...</div>}>
      <AnalyzeContent />
    </Suspense>
  );
}
