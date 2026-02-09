import { z } from "zod";

// ----- Legacy (kept for backward compat and Gemini response) -----
export const ClaimSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  category: z.string(),
  checkability: z.string(),
  importance: z.string(),
  sourceEvidenceIds: z.array(z.string()).optional(),
});

export const EvidenceLedgerItemSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  filename: z.string().optional(),
  url: z.string().optional(),
  name: z.string().optional(),
  keyFacts: z.array(z.string()),
  extractedFacts: z.array(z.string()).optional(),
  extractedTextPreview: z.string().optional(),
  createdAt: z.string().optional(),
  timestamps: z.string().optional(),
  crossRefs: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ContradictionSchema = z.object({
  evidenceA: z.string().optional(),
  evidenceB: z.string().optional(),
  description: z.string().optional(),
  claimId: z.string().optional(),
  a: z.object({ source: z.string(), detail: z.string() }).optional(),
  b: z.object({ source: z.string(), detail: z.string() }).optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  explanation: z.string().optional(),
});

export const ManipulationSegmentSchema = z.object({
  type: z.enum(["video", "audio", "image", "text"]),
  start: z.number().optional(),
  end: z.number().optional(),
  reason: z.string(),
  quote: z.string().optional(),
});

export const CitationSchema = z.object({
  title: z.string(),
  domain: z.string(),
  snippet: z.string(),
  link: z.string(),
  url: z.string().optional(),
});

export const ClaimVerificationSchema = z.object({
  claimIndex: z.number().optional(),
  claimId: z.string().optional(),
  status: z.enum(["Supported", "Disputed", "Not found", "NotFound"]),
  citations: z.array(CitationSchema),
  notes: z.string().optional(),
});

// New: scores and aiAnalysis
export const ScoresSchema = z.object({
  consistency: z.number().min(0).max(100),
  manipulationRisk: z.number().min(0).max(100),
  bias: z.number().min(0).max(100),
  scamRisk: z.number().min(0).max(100),
  timelineConfidence: z.number().min(0).max(100),
  aiLikelihood: z.number().min(0).max(100),
});

export const FlaggedSegmentVideoAudioSchema = z.object({
  modality: z.enum(["video", "audio"]),
  startSec: z.number(),
  endSec: z.number(),
  reason: z.string(),
  confidence: z.number().min(0).max(100),
});

export const FlaggedSegmentTextSchema = z.object({
  modality: z.literal("text"),
  snippet: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(100),
});

export const FlaggedSegmentImageSchema = z.object({
  modality: z.literal("image"),
  regionHint: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(100),
});

export const FlaggedSegmentSchema = z.discriminatedUnion("modality", [
  FlaggedSegmentVideoAudioSchema,
  FlaggedSegmentTextSchema,
  FlaggedSegmentImageSchema,
]);

export const AiAnalysisSchema = z.object({
  overallLikelihood: z.number().min(0).max(100),
  breakdownByModality: z.object({
    text: z.number().optional(),
    image: z.number().optional(),
    audio: z.number().optional(),
    video: z.number().optional(),
    link: z.number().optional(),
    pdf: z.number().optional(),
  }).optional(),
  flaggedSegments: z.array(FlaggedSegmentSchema),
  signals: z.array(z.string()),
});

export const TruthReportSchema = z.object({
  executiveSummary: z.object({
    verdict: z.enum(["Likely True", "Mixed/Unclear", "Likely False", "Manipulated/Deceptive"]),
    confidence: z.number().min(0).max(100),
    why: z.array(z.string()),
    whatToDoNext: z.array(z.string()),
    nextSteps: z.array(z.string()).optional(),
  }),
  claimsDetected: z.array(ClaimSchema),
  claims: z.array(ClaimSchema).optional(),
  evidenceLedger: z.array(EvidenceLedgerItemSchema),
  crossModalConsistency: z.object({
    contradictions: z.array(ContradictionSchema),
    missingContextFlags: z.array(z.string()),
    consistencyScore: z.number().min(0).max(100),
  }),
  manipulationLikelihood: z.object({
    aiGeneratedScore: z.number().min(0).max(100),
    deepfakeSignals: z.array(z.string()),
    whichParts: z.array(ManipulationSegmentSchema),
    signals: z.array(z.string()),
  }),
  biasPersuasion: z.object({
    biasScore: z.number().min(0).max(100),
    persuasionTactics: z.array(z.string()),
    emotionalManipulation: z.array(z.string()),
    scamRiskScore: z.number().min(0).max(100),
    explanation: z.string(),
  }),
  timeline: z.object({
    events: z.array(z.object({
      time: z.string().optional(),
      t: z.string().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
      confidence: z.string().optional(),
      sourceIds: z.array(z.string()).optional(),
      inferred: z.boolean().optional(),
    })),
    timelineConfidence: z.number().min(0).max(100),
    confidence: z.number().optional(),
  }),
  externalVerification: z.object({
    claimVerifications: z.array(ClaimVerificationSchema),
    sourceReliabilityNote: z.string(),
    unavailable: z.boolean().optional(),
    enabled: z.boolean().optional(),
    summary: z.string().optional(),
    perClaim: z.array(z.object({
      claimId: z.string(),
      status: z.string(),
      notes: z.string(),
      citations: z.array(CitationSchema),
    })).optional(),
    reliabilityNote: z.string().optional(),
  }),
  transparency: z.object({
    whatWasAnalyzed: z.array(z.string()),
    analyzed: z.array(z.string()).optional(),
    notAnalyzed: z.array(z.string()).optional(),
    limitations: z.array(z.string()),
    safetyNote: z.string().optional(),
  }),
  verdict: z.enum(["Likely True", "Mixed/Unclear", "Likely False", "Manipulated/Deceptive"]).optional(),
  confidence: z.number().optional(),
  scores: ScoresSchema.optional(),
  aiAnalysis: AiAnalysisSchema.optional(),
  contradictions: z.array(ContradictionSchema).optional(),
});

export type TruthReportZod = z.infer<typeof TruthReportSchema>;
