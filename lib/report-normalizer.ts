import type { TruthReport, Scores, AiAnalysis, Contradiction, FlaggedSegment } from "./types";

// Normalize report JSON into the UI-friendly shape.
export function normalizeReport(report: TruthReport): TruthReport {
  const es = report.executiveSummary;
  const scores: Scores = report.scores ?? {
    consistency: report.crossModalConsistency?.consistencyScore ?? 0,
    manipulationRisk: report.manipulationLikelihood?.aiGeneratedScore ?? 0,
    bias: report.biasPersuasion?.biasScore ?? 0,
    scamRisk: report.biasPersuasion?.scamRiskScore ?? 0,
    timelineConfidence: report.timeline?.timelineConfidence ?? 0,
    aiLikelihood: report.aiAnalysis?.overallLikelihood ?? report.manipulationLikelihood?.aiGeneratedScore ?? 0,
  };
  const claims = report.claims ?? report.claimsDetected ?? [];
  const contradictions: Contradiction[] = report.contradictions ?? report.crossModalConsistency?.contradictions ?? [];
  const whichParts = report.manipulationLikelihood?.whichParts ?? [];
  const flaggedSegments: FlaggedSegment[] = report.aiAnalysis?.flaggedSegments ?? whichParts.map((p) => {
    if (p.type === "video" || p.type === "audio") {
      return { modality: p.type, startSec: p.start ?? 0, endSec: p.end ?? 0, reason: p.reason, confidence: 70 };
    }
    if (p.type === "text") {
      return { modality: "text" as const, snippet: p.quote ?? "", reason: p.reason, confidence: 70 };
    }
    return { modality: "image" as const, regionHint: "see reason", reason: p.reason, confidence: 70 };
  });
  const aiAnalysis: AiAnalysis = report.aiAnalysis ?? {
    overallLikelihood: report.manipulationLikelihood?.aiGeneratedScore ?? 0,
    breakdownByModality: {},
    flaggedSegments,
    signals: report.manipulationLikelihood?.signals ?? [],
  };
  return {
    ...report,
    reportError: report.reportError,
    reportSource: report.reportSource,
    verdict: report.verdict ?? es.verdict,
    confidence: report.confidence ?? es.confidence,
    scores,
    claims: claims.map((c, i) => ({ ...c, id: c.id ?? `c-${i}` })),
    claimsDetected: claims,
    contradictions,
    aiAnalysis: { ...aiAnalysis, flaggedSegments },
    executiveSummary: {
      ...es,
      nextSteps: es.nextSteps ?? es.whatToDoNext,
    },
    evidenceLedger: (report.evidenceLedger ?? []).map((e, i) => ({
      ...e,
      id: e.id ?? `e-${i}`,
      name: e.name ?? e.filename ?? e.url ?? `Evidence ${i + 1}`,
      extractedFacts: e.extractedFacts ?? e.keyFacts,
    })),
    timeline: {
      ...report.timeline,
      events: (report.timeline?.events ?? []).map((ev) => ({
        ...ev,
        label: ev.label ?? ev.description ?? ev.time ?? ev.t ?? "",
        t: ev.t ?? ev.time,
      })),
      confidence: report.timeline?.confidence ?? report.timeline?.timelineConfidence ?? 0,
    },
    externalVerification: {
      ...report.externalVerification,
      enabled: report.externalVerification?.enabled ?? !report.externalVerification?.unavailable,
      perClaim: report.externalVerification?.perClaim ?? (report.externalVerification?.claimVerifications ?? []).map((cv, i) => ({
        claimId: cv.claimId ?? `c-${cv.claimIndex ?? i}`,
        status: cv.status === "Not found" ? "NotFound" : cv.status,
        notes: cv.notes ?? "",
        citations: cv.citations ?? [],
      })),
      reliabilityNote: report.externalVerification?.reliabilityNote ?? report.externalVerification?.sourceReliabilityNote,
    },
    transparency: {
      ...report.transparency,
      analyzed: report.transparency?.analyzed ?? report.transparency?.whatWasAnalyzed,
      notAnalyzed: report.transparency?.notAnalyzed ?? [],
    },
  };
}

// Derive 3–5 key findings for the summary strip.
export function deriveKeyFindings(report: TruthReport): string[] {
  const findings: string[] = [];
  const r = normalizeReport(report);
  if (r.contradictions?.length) {
    const severest = r.contradictions.find((c) => c.severity === "high") ?? r.contradictions[0];
    findings.push(severest.explanation ?? severest.description ?? `Contradiction: ${severest.a?.source ?? ""} vs ${severest.b?.source ?? ""}`);
  }
  const scores = r.scores;
  if (scores) {
    if (scores.scamRisk >= 70) findings.push(`High scam risk (${scores.scamRisk}%) — treat with caution.`);
    else if (scores.manipulationRisk >= 70) findings.push(`High AI/manipulation likelihood (${scores.manipulationRisk}%).`);
  }
  const perClaim = r.externalVerification?.perClaim;
  if (perClaim?.length) {
    const disputed = perClaim.find((p) => p.status === "Disputed" || p.status === "NotFound");
    if (disputed) findings.push(`At least one claim disputed or not found in external sources.`);
    const supported = perClaim.filter((p) => p.status === "Supported");
    if (supported.length) findings.push(`${supported.length} claim(s) supported by external sources.`);
  }
  const signals = r.aiAnalysis?.signals?.length ? r.aiAnalysis.signals[0] : r.manipulationLikelihood?.signals?.[0];
  if (signals) findings.push(`Top signal: ${signals}`);
  return findings.slice(0, 5);
}
