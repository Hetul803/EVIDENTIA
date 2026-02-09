import { create } from "zustand";
import type { EvidenceItem, AnalysisStep, FindingTickerItem } from "./types";

interface AnalyzeState {
  evidenceQueue: EvidenceItem[];
  steps: AnalysisStep[];
  findings: FindingTickerItem[];
  reportId: string | null;
  isAnalyzing: boolean;
  addEvidence: (item: Omit<EvidenceItem, "id" | "status">) => void;
  setEvidenceUploadKey: (id: string, uploadKey: string) => void;
  removeEvidence: (id: string) => void;
  setEvidenceStatus: (id: string, status: EvidenceItem["status"], error?: string) => void;
  setStepStatus: (id: string, status: AnalysisStep["status"]) => void;
  addFinding: (text: string, step: string) => void;
  setReportId: (id: string | null) => void;
  setAnalyzing: (v: boolean) => void;
  reset: () => void;
}

const defaultSteps: AnalysisStep[] = [
  { id: "ingest", label: "Ingest", status: "pending" },
  { id: "claims", label: "Extract claims", status: "pending" },
  { id: "crosscheck", label: "Cross-check evidence", status: "pending" },
  { id: "manipulation", label: "Manipulation signals", status: "pending" },
  { id: "external", label: "External verification", status: "pending" },
  { id: "report", label: "Build report", status: "pending" },
];

export const useAnalyzeStore = create<AnalyzeState>((set) => ({
  evidenceQueue: [],
  steps: defaultSteps,
  findings: [],
  reportId: null,
  isAnalyzing: false,
  addEvidence: (item) =>
    set((s) => ({
      evidenceQueue: [
        ...s.evidenceQueue,
        {
          ...item,
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: "pending",
        },
      ],
    })),
  setEvidenceUploadKey: (id, uploadKey) =>
    set((s) => ({
      evidenceQueue: s.evidenceQueue.map((e) =>
        e.id === id ? { ...e, uploadKey } : e
      ),
    })),
  removeEvidence: (id) =>
    set((s) => ({ evidenceQueue: s.evidenceQueue.filter((e) => e.id !== id) })),
  setEvidenceStatus: (id, status, error) =>
    set((s) => ({
      evidenceQueue: s.evidenceQueue.map((e) =>
        e.id === id ? { ...e, status, error } : e
      ),
    })),
  setStepStatus: (id, status) =>
    set((s) => ({
      steps: s.steps.map((st) => (st.id === id ? { ...st, status } : st)),
    })),
  addFinding: (text, step) =>
    set((s) => ({
      findings: [
        ...s.findings,
        { id: `f-${Date.now()}`, text, step, at: Date.now() },
      ].slice(-20),
    })),
  setReportId: (reportId) => set({ reportId }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  reset: () =>
    set({
      evidenceQueue: [],
      steps: defaultSteps.map((s) => ({ ...s, status: "pending" as const })),
      findings: [],
      reportId: null,
      isAnalyzing: false,
    }),
}));
