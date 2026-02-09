// Core types for reports, evidence, and UI state.

export type Verdict = "Likely True" | "Mixed/Unclear" | "Likely False" | "Manipulated/Deceptive";

export interface Claim {
  id?: string;
  text: string;
  category: string;
  checkability: string;
  importance: string;
  sourceEvidenceIds?: string[];
}

export interface EvidenceLedgerItem {
  id?: string;
  type: string;
  filename?: string;
  url?: string;
  name?: string;
  keyFacts: string[];
  extractedFacts?: string[];
  extractedTextPreview?: string;
  createdAt?: string;
  timestamps?: string;
  crossRefs?: string[];
  metadata?: Record<string, unknown>;
}

export interface Contradiction {
  evidenceA?: string;
  evidenceB?: string;
  description?: string;
  claimId?: string;
  a?: { source: string; detail: string };
  b?: { source: string; detail: string };
  severity?: "low" | "medium" | "high";
  explanation?: string;
}

export interface ManipulationSegment {
  type: "video" | "audio" | "image" | "text";
  start?: number;
  end?: number;
  reason: string;
  quote?: string;
}

// Display-friendly AI analysis segments.
export type FlaggedSegment =
  | { modality: "video" | "audio"; startSec: number; endSec: number; reason: string; confidence: number }
  | { modality: "text"; snippet: string; reason: string; confidence: number }
  | { modality: "image"; regionHint: string; reason: string; confidence: number };

export interface AiAnalysis {
  overallLikelihood: number;
  breakdownByModality?: { text?: number; image?: number; audio?: number; video?: number; link?: number; pdf?: number };
  flaggedSegments: FlaggedSegment[];
  signals: string[];
}

export interface Scores {
  consistency: number;
  manipulationRisk: number;
  bias: number;
  scamRisk: number;
  timelineConfidence: number;
  aiLikelihood: number;
}

export interface Citation {
  title: string;
  domain: string;
  snippet: string;
  link: string;
  url?: string;
}

export interface ClaimVerification {
  claimIndex?: number;
  claimId?: string;
  status: "Supported" | "Disputed" | "Not found" | "NotFound";
  citations: Citation[];
  notes?: string;
}

export interface ExternalVerificationDisplay {
  enabled: boolean;
  summary?: string;
  perClaim?: Array<{ claimId: string; status: string; notes: string; citations: Citation[] }>;
  reliabilityNote?: string;
}

export interface TruthReport {
  executiveSummary: {
    verdict: Verdict;
    confidence: number;
    why: string[];
    whatToDoNext: string[];
    nextSteps?: string[];
  };
  claimsDetected: Claim[];
  claims?: Claim[];
  evidenceLedger: EvidenceLedgerItem[];
  crossModalConsistency: {
    contradictions: Contradiction[];
    missingContextFlags: string[];
    consistencyScore: number;
  };
  manipulationLikelihood: {
    aiGeneratedScore: number;
    deepfakeSignals: string[];
    whichParts: ManipulationSegment[];
    signals: string[];
  };
  biasPersuasion: {
    biasScore: number;
    persuasionTactics: string[];
    emotionalManipulation: string[];
    scamRiskScore: number;
    explanation: string;
  };
  timeline: {
    events: Array<{ time?: string; t?: string; label?: string; description?: string; confidence?: string; sourceIds?: string[]; inferred?: boolean }>;
    timelineConfidence: number;
    confidence?: number;
  };
  externalVerification: {
    claimVerifications: ClaimVerification[];
    sourceReliabilityNote: string;
    unavailable?: boolean;
    enabled?: boolean;
    summary?: string;
    perClaim?: Array<{ claimId: string; status: string; notes: string; citations: Citation[] }>;
    reliabilityNote?: string;
  };
  transparency: {
    whatWasAnalyzed: string[];
    analyzed?: string[];
    notAnalyzed?: string[];
    limitations: string[];
    safetyNote?: string;
  };
  // New unified fields (optional for backward compat)
  verdict?: Verdict;
  confidence?: number;
  scores?: Scores;
  aiAnalysis?: AiAnalysis;
  contradictions?: Contradiction[];
  timelineConfidence?: number;
  externalVerificationSummary?: string;
  /** Present when analysis falls back or Gemini fails. */
  reportError?: ReportError;
  /** Report origin: live or demo. */
  reportSource?: "live" | "demo";
}

export type EvidenceType = "text" | "link" | "pdf" | "image" | "audio" | "video";

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  filename?: string;
  url?: string;
  text?: string;
  uploadKey?: string;
  status: "pending" | "ingesting" | "extracting" | "done" | "error";
  error?: string;
}

export interface AnalysisStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
}

export interface FindingTickerItem {
  id: string;
  text: string;
  step: string;
  at: number;
}

/** UI-visible error; never include secrets. */
export type ReportErrorCode = "missing_key" | "gemini_error" | "fallback_demo_mode";

export interface ReportError {
  code: ReportErrorCode;
  message: string;
  statusCode?: number;
}
