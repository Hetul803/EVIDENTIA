import { TruthReportSchema, type TruthReportZod } from "./schemas";
import { generateContent, generateContentWithParts, getGeminiClient } from "./client";
import { searchExternal, isExternalVerificationConfigured } from "@/lib/search/external";
import { CLAIMS_EXTRACTION_PROMPT } from "@/lib/prompts/v1_claims";
import { MANIPULATION_SIGNALS_PROMPT } from "@/lib/prompts/v1_manipulation";
import { REPORT_ORCHESTRATOR_PROMPT } from "@/lib/prompts/v1_report";
import { CITATIONS_SUMMARY_PROMPT } from "@/lib/prompts/v1_citations";
import { extractTextFromPdf } from "@/lib/extractors/pdf";
import { extractTextFromHtml } from "@/lib/extractors/html";
import { imageToBase64 } from "@/lib/extractors/image";
import { getAudioPlaceholderText } from "@/lib/extractors/audio";
import {
  extractVideoKeyframes,
  extractVideoAudio,
  getVideoPlaceholderText,
} from "@/lib/extractors/video";
import type { TruthReport, ReportError } from "@/lib/types";
import path from "path";
import fs from "fs";

export interface OrchestratorResult {
  report: TruthReport;
  source: "live" | "demo";
  reportError?: ReportError;
}

function buildMinimalErrorReport(errorMessage: string, inputs: NormalizedInput[]): TruthReport {
  return {
    executiveSummary: {
      verdict: "Mixed/Unclear",
      confidence: 0,
      why: ["Analysis could not be completed. See the error callout above."],
      whatToDoNext: ["Check your GEMINI_API_KEY and try again.", "Ensure the API is not rate-limited.", "Retry with shorter or different evidence."],
      nextSteps: ["Retry analysis.", "Check API key and quotas."],
    },
    claimsDetected: [],
    claims: [],
    evidenceLedger: inputs.map((i, idx) => ({
      id: `e${idx + 1}`,
      type: i.type,
      name: i.filename ?? i.url ?? `Evidence ${idx + 1}`,
      keyFacts: [],
      extractedFacts: [],
    })),
    crossModalConsistency: { contradictions: [], missingContextFlags: [], consistencyScore: 0 },
    manipulationLikelihood: { aiGeneratedScore: 0, deepfakeSignals: [], whichParts: [], signals: [] },
    biasPersuasion: { biasScore: 0, persuasionTactics: [], emotionalManipulation: [], scamRiskScore: 0, explanation: "" },
    timeline: {
      events: inputs.map((i, idx) => ({
        time: idx === 0 ? "T0" : `T0+${idx}`,
        description: `Evidence submitted: ${i.filename ?? i.url ?? `Evidence ${idx + 1}`} (${i.type})`,
        confidence: "low",
      })) as Array<{ time: string; description: string; confidence?: string }>,
      timelineConfidence: inputs.length > 1 ? 55 : 35,
    },
    externalVerification: { claimVerifications: [], sourceReliabilityNote: "", unavailable: true },
    transparency: {
      whatWasAnalyzed: inputs.map((i) => `${i.type}: ${i.filename ?? i.url ?? "pasted"}`),
      analyzed: inputs.map((i) => `${i.type}: ${i.filename ?? i.url ?? "pasted"}`),
      notAnalyzed: [],
      limitations: ["Analysis failed before completion."],
      safetyNote: "This report is for decision support only. Not legal or professional advice.",
    },
  };
}

function getErrorStatusCode(e: unknown): number | undefined {
  if (e && typeof e === "object") {
    if ("status" in e && typeof (e as { status: number }).status === "number") return (e as { status: number }).status;
    if ("response" in e && (e as { response?: { status?: number } }).response?.status) return (e as { response: { status: number } }).response.status;
  }
  return undefined;
}

export interface NormalizedInput {
  type: string;
  filename?: string;
  url?: string;
  text: string;
  imageBase64?: { mimeType: string; data: string };
  keyframePaths?: string[];
  audioPath?: string;
}

export async function normalizeEvidence(
  evidence: { type: string; filePath?: string; url?: string; text?: string }
): Promise<NormalizedInput> {
  const { type, filePath, url, text } = evidence;
  if (type === "text" && text) {
    return { type: "text", text: text.slice(0, 100000) };
  }
  if (type === "link" && (url || text)) {
    const raw = text ?? "";
    const extracted = extractTextFromHtml(raw);
    return { type: "link", url, text: extracted || raw || "[No content]" };
  }
  if (type === "pdf" && filePath && fs.existsSync(filePath)) {
    const extracted = await extractTextFromPdf(filePath);
    return {
      type: "pdf",
      filename: path.basename(filePath),
      text: extracted,
    };
  }
  if (type === "image" && filePath && fs.existsSync(filePath)) {
    const { mimeType, data } = imageToBase64(filePath);
    return {
      type: "image",
      filename: path.basename(filePath),
      text: "[Image provided]",
      imageBase64: { mimeType, data },
    };
  }
  if (type === "audio" && filePath) {
    const placeholder = getAudioPlaceholderText();
    return {
      type: "audio",
      filename: path.basename(filePath),
      text: placeholder,
      audioPath: fs.existsSync(filePath) ? filePath : undefined,
    };
  }
  if (type === "video" && filePath) {
    const outDir = path.join(path.dirname(filePath), "keyframes");
    const { frames } = extractVideoKeyframes(filePath, outDir);
    const { audioPath } = extractVideoAudio(filePath, outDir);
    const placeholder = getVideoPlaceholderText(filePath, frames);
    return {
      type: "video",
      filename: path.basename(filePath),
      text: placeholder,
      keyframePaths: frames,
      audioPath,
    };
  }
  return { type: "unknown", text: text ?? "[No content]" };
}

function fileToBase64(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return buf.toString("base64");
}

function clampFrames(paths: string[] | undefined, max: number): string[] {
  if (!paths?.length) return [];
  if (paths.length <= max) return paths;
  const step = Math.max(1, Math.floor(paths.length / max));
  const picked: string[] = [];
  for (let i = 0; i < paths.length && picked.length < max; i += step) picked.push(paths[i]);
  return picked;
}

async function transcribeAudioIfPossible(input: NormalizedInput): Promise<string | null> {
  if (!input.audioPath || !fs.existsSync(input.audioPath)) return null;
  try {
    const mimeType = input.audioPath.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
    const data = fileToBase64(input.audioPath);
    const prompt = `Transcribe the audio accurately. Output JSON: {"transcript":"..."}. Return ONLY JSON.`;
    const raw = await generateContentWithParts(prompt, [{ mimeType, data }], { jsonMode: true });
    const json = parseJson<{ transcript?: string }>(raw);
    const t = (json.transcript ?? "").trim();
    return t ? t.slice(0, 20000) : null;
  } catch (e) {
    console.error("Audio transcription failed:", e);
    return null;
  }
}

async function analyzeImagesIfPossible(inputs: NormalizedInput[]): Promise<Record<string, { summary: string; extractedText?: string; manipulationSignals?: string[] }>> {
  const out: Record<string, { summary: string; extractedText?: string; manipulationSignals?: string[] }> = {};
  const imageItems = inputs
    .map((i, idx) => ({ i, id: `e${idx + 1}` }))
    .filter((x) => x.i.type === "image" && x.i.imageBase64);
  for (const item of imageItems) {
    try {
      const prompt = `You are a media forensics analyst. Analyze the provided image.
Return JSON: {"summary":"1-3 sentences describing what's shown","extractedText":"any visible text (OCR)","manipulationSignals":["..."]}.
Return ONLY JSON.`;
      const raw = await generateContentWithParts(
        prompt,
        [{ mimeType: item.i.imageBase64!.mimeType, data: item.i.imageBase64!.data }],
        { jsonMode: true }
      );
      const json = parseJson<{ summary?: string; extractedText?: string; manipulationSignals?: string[] }>(raw);
      out[item.id] = {
        summary: (json.summary ?? "").slice(0, 500),
        extractedText: (json.extractedText ?? "").slice(0, 2000) || undefined,
        manipulationSignals: (json.manipulationSignals ?? []).slice(0, 10),
      };
    } catch (e) {
      console.error("Image analysis failed:", e);
    }
  }
  return out;
}

async function analyzeVideoKeyframesIfPossible(inputs: NormalizedInput[]): Promise<Record<string, { summary: string; manipulationSignals?: string[] }>> {
  const out: Record<string, { summary: string; manipulationSignals?: string[] }> = {};
  const videoItems = inputs
    .map((i, idx) => ({ i, id: `e${idx + 1}` }))
    .filter((x) => x.i.type === "video" && (x.i.keyframePaths?.length ?? 0) > 0);

  for (const item of videoItems) {
    try {
      const picked = clampFrames(item.i.keyframePaths, 8);
      const parts = picked
        .filter((p) => fs.existsSync(p))
        .map((p) => ({ mimeType: "image/jpeg", data: fileToBase64(p) }));
      if (parts.length === 0) continue;
      const prompt = `You are a media forensics analyst. You are given keyframes extracted from a video.
Return JSON: {"summary":"2-5 sentences describing what happens across frames","manipulationSignals":["..."]}.
Focus on inconsistencies across frames, unnatural artifacts, or signs of editing. Return ONLY JSON.`;
      const raw = await generateContentWithParts(prompt, parts, { jsonMode: true });
      const json = parseJson<{ summary?: string; manipulationSignals?: string[] }>(raw);
      out[item.id] = {
        summary: (json.summary ?? "").slice(0, 700),
        manipulationSignals: (json.manipulationSignals ?? []).slice(0, 10),
      };
    } catch (e) {
      console.error("Video keyframe analysis failed:", e);
    }
  }
  return out;
}

function combineEvidenceText(inputs: NormalizedInput[]): string {
  return inputs
    .map((i, idx) => {
      const evid = `e${idx + 1}`;
      const header = `--- Evidence ${evid} (${i.type}${i.filename ? ": " + i.filename : ""}) ---`;
      return `${header}\n${i.text}`;
    })
    .join("\n\n");
}

function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```json?\s*|\s*```$/g, "").trim();
  return JSON.parse(cleaned) as T;
}

function mapWhichPartsToFlaggedSegments(
  whichParts: Array<{ type: string; start?: number; end?: number; reason: string; quote?: string; confidence?: number }>
): Array<{ modality: "video" | "audio"; startSec: number; endSec: number; reason: string; confidence: number } | { modality: "text"; snippet: string; reason: string; confidence: number } | { modality: "image"; regionHint: string; reason: string; confidence: number }> {
  return whichParts.map((p) => {
    const conf = p.confidence ?? 70;
    if (p.type === "video" || p.type === "audio") {
      return { modality: p.type as "video" | "audio", startSec: p.start ?? 0, endSec: p.end ?? 1, reason: p.reason, confidence: conf };
    }
    if (p.type === "text") {
      return { modality: "text" as const, snippet: p.quote ?? "", reason: p.reason, confidence: conf };
    }
    return { modality: "image" as const, regionHint: "see reason", reason: p.reason, confidence: conf };
  });
}

export async function runOrchestrator(
  inputs: NormalizedInput[],
  onStep?: (step: string) => void,
  options?: { scenarioId?: string; mode?: string }
): Promise<OrchestratorResult> {
  const hasGemini = !!getGeminiClient();
  const mode = options?.mode ?? "normal";

  if (!hasGemini) {
    const report = getSeededReport(inputs, options?.scenarioId);
    const reportError: ReportError | undefined =
      mode === "demo"
        ? undefined
        : { code: "missing_key", message: "GEMINI_API_KEY not configured. Add it in .env for full analysis." };
    return { report, source: "demo", reportError };
  }

  const imageAnalyses = await analyzeImagesIfPossible(inputs);
  const videoAnalyses = await analyzeVideoKeyframesIfPossible(inputs);
  const withTranscripts: NormalizedInput[] = [];
  for (let idx = 0; idx < inputs.length; idx++) {
    const i = inputs[idx];
    const evidId = `e${idx + 1}`;
    if (i.type === "audio" || i.type === "video") {
      const transcript = await transcribeAudioIfPossible(i);
      if (transcript) {
        const prefix = i.type === "video" ? "[Audio transcript extracted from video]\n" : "[Audio transcript]\n";
        withTranscripts.push({ ...i, text: `${i.text}\n\n${prefix}${transcript}` });
        continue;
      }
    }
    if (i.type === "image") {
      const ia = imageAnalyses[evidId];
      if (ia) {
        const imgText = ia.extractedText ? `\n\n[Image text]\n${ia.extractedText}` : "";
        const sig = ia.manipulationSignals?.length ? `\n\n[Image manipulation signals]\n- ${ia.manipulationSignals.join("\n- ")}` : "";
        withTranscripts.push({ ...i, text: `${i.text}\n\n[Image summary]\n${ia.summary}${imgText}${sig}` });
        continue;
      }
    }
    if (i.type === "video") {
      const va = videoAnalyses[evidId];
      if (va?.summary) {
        const sig = va.manipulationSignals?.length ? `\n\n[Video manipulation signals]\n- ${va.manipulationSignals.join("\n- ")}` : "";
        withTranscripts.push({ ...i, text: `${i.text}\n\n[Video keyframes summary]\n${va.summary}${sig}` });
        continue;
      }
    }
    withTranscripts.push(i);
  }

  const evidenceBlob = combineEvidenceText(withTranscripts);
  onStep?.("claims");
  const claimsPrompt = CLAIMS_EXTRACTION_PROMPT.replace("{evidence}", evidenceBlob);
  let claimsJson: { claims: Array<{ id?: string; text: string; category: string; checkability: string; importance: string; sourceEvidenceIds?: string[] }> } = { claims: [] };
  try {
    const claimsRaw = await generateContent(claimsPrompt, { jsonMode: true });
    claimsJson = parseJson(claimsRaw);
  } catch (e) {
    console.error("Claims extraction failed:", e);
  }
  claimsJson.claims = claimsJson.claims.map((c, i) => ({ ...c, id: c.id ?? `c${i + 1}` }));

  onStep?.("manipulation");
  let manipulationJson: {
    aiGeneratedScore: number;
    deepfakeSignals: string[];
    whichParts: Array<{ type: string; start?: number; end?: number; reason: string; quote?: string; confidence?: number }>;
    signals: string[];
  } = {
    aiGeneratedScore: 0,
    deepfakeSignals: [],
    whichParts: [],
    signals: [],
  };
  try {
    const manipPrompt = MANIPULATION_SIGNALS_PROMPT.replace("{evidence}", evidenceBlob);
    const manipRaw = await generateContent(manipPrompt, { jsonMode: true });
    manipulationJson = parseJson(manipRaw);
  } catch (e) {
    console.error("Manipulation analysis failed:", e);
  }

  const evidenceLedger = withTranscripts.map((i, idx) => ({
    id: `e${idx + 1}`,
    type: i.type,
    name: i.filename ?? i.url ?? `Evidence ${idx + 1}`,
    filename: i.filename,
    url: i.url,
    keyFacts: i.type === "image" && imageAnalyses[`e${idx + 1}`]?.summary ? [imageAnalyses[`e${idx + 1}`].summary] : [],
    extractedFacts: [] as string[],
    extractedTextPreview: i.text?.slice(0, 300),
    crossRefs: [`Evidence ${idx + 1}`],
  }));

  const consistency = {
    contradictions: [] as Array<{ evidenceA: string; evidenceB: string; description: string }>,
    missingContextFlags: [] as string[],
    consistencyScore: 85,
  };
  const bias = {
    biasScore: 0,
    persuasionTactics: [] as string[],
    emotionalManipulation: [] as string[],
    scamRiskScore: 0,
    explanation: "",
  };
  const timeline = {
    events: withTranscripts.map((i, idx) => ({
      time: idx === 0 ? "T0" : `T0+${idx}`,
      description: `Evidence submitted: ${i.filename ?? i.url ?? `Evidence ${idx + 1}`} (${i.type})`,
      confidence: "low",
    })) as Array<{ time: string; description: string; confidence?: string }>,
    timelineConfidence: withTranscripts.length > 1 ? 55 : 35,
  };

  let claimVerifications: Array<{
    claimIndex: number;
    claimId?: string;
    status: "Supported" | "Disputed" | "Not found";
    notes?: string;
    citations: Array<{ title: string; domain: string; snippet: string; link: string }>;
  }> = [];
  let sourceReliabilityNote = "External verification not configured.";
  const hasSearch = isExternalVerificationConfigured();
  if (hasSearch && claimsJson.claims.length > 0) {
    onStep?.("external");
    const topClaims = claimsJson.claims.slice(0, 6);
    const perClaimResults = await Promise.all(
      topClaims.map(async (c, idx) => {
        const results = await searchExternal(c.text, 5);
        return {
          claimIndex: idx,
          claimId: c.id,
          text: c.text,
          sourceEvidenceIds: c.sourceEvidenceIds ?? [],
          results: (results ?? []).slice(0, 5),
        };
      })
    );

    const searchBlob = perClaimResults
      .map((p) => {
        const header = `ClaimIndex: ${p.claimIndex}\nClaimId: ${p.claimId}\nClaim: ${p.text}`;
        const lines = (p.results ?? [])
          .map((r) => `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}`)
          .join("\n---\n");
        return `${header}\nSEARCH RESULTS:\n${lines || "[none]"}`;
      })
      .join("\n\n====\n\n");

    const citPrompt = CITATIONS_SUMMARY_PROMPT.replace(
      "{claims}",
      JSON.stringify(perClaimResults.map((p) => ({ claimIndex: p.claimIndex, claimId: p.claimId, text: p.text, sourceEvidenceIds: p.sourceEvidenceIds })))
    ).replace("{searchResults}", searchBlob);
    try {
      const citRaw = await generateContent(citPrompt, { jsonMode: true });
      const citJson = parseJson<{
        claimVerifications: typeof claimVerifications;
        sourceReliabilityNote: string;
      }>(citRaw);
      claimVerifications = citJson.claimVerifications ?? [];
      sourceReliabilityNote = citJson.sourceReliabilityNote ?? sourceReliabilityNote;
    } catch (e) {
      console.error("Citations failed:", e);
    }
  }
  onStep?.("report");
  const reportPrompt = REPORT_ORCHESTRATOR_PROMPT.replace(
    "{claims}",
    JSON.stringify(claimsJson.claims, null, 2)
  )
    .replace("{evidenceLedger}", JSON.stringify(evidenceLedger, null, 2))
    .replace("{consistency}", JSON.stringify(consistency, null, 2))
    .replace("{manipulation}", JSON.stringify(manipulationJson, null, 2))
    .replace("{bias}", JSON.stringify(bias, null, 2))
    .replace("{timeline}", JSON.stringify(timeline, null, 2));

  let reportJson: TruthReportZod;
  try {
    const reportRaw = await generateContent(reportPrompt, { jsonMode: true });
    reportJson = parseJson(reportRaw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const statusCode = getErrorStatusCode(e);
    console.error("EVIDENTIA report synthesis failed:", { code: "gemini_error", message: msg, statusCode });
    return {
      report: buildMinimalErrorReport(msg, inputs),
      source: "live",
      reportError: { code: "gemini_error", message: msg, statusCode },
    };
  }

  const parsed = TruthReportSchema.safeParse(reportJson);
  if (!parsed.success) {
    const msg = parsed.error.message;
    console.error("EVIDENTIA report schema validation failed:", msg);
    return {
      report: buildMinimalErrorReport(`Invalid report shape: ${msg}`, inputs),
      source: "live",
      reportError: { code: "gemini_error", message: `Report validation failed: ${msg}` },
    };
  }

  const p = parsed.data;
  const flaggedSegments = mapWhichPartsToFlaggedSegments(manipulationJson.whichParts);
  const scores = p.scores ?? {
    consistency: p.crossModalConsistency.consistencyScore,
    manipulationRisk: p.manipulationLikelihood.aiGeneratedScore,
    bias: p.biasPersuasion.biasScore,
    scamRisk: p.biasPersuasion.scamRiskScore,
    timelineConfidence: p.timeline.timelineConfidence,
    aiLikelihood: p.aiAnalysis?.overallLikelihood ?? p.manipulationLikelihood.aiGeneratedScore,
  };
  const aiAnalysis = p.aiAnalysis ?? {
    overallLikelihood: p.manipulationLikelihood.aiGeneratedScore,
    breakdownByModality: {},
    flaggedSegments,
    signals: p.manipulationLikelihood.signals,
  };
  if (!aiAnalysis.flaggedSegments?.length && flaggedSegments.length) aiAnalysis.flaggedSegments = flaggedSegments;

  const report: TruthReport = {
    ...p,
    verdict: p.verdict ?? p.executiveSummary.verdict,
    confidence: p.confidence ?? p.executiveSummary.confidence,
    scores,
    aiAnalysis,
    claims: (p.claims ?? p.claimsDetected).map((c, i) => ({ ...c, id: c.id ?? `c${i + 1}` })),
    claimsDetected: p.claimsDetected.map((c, i) => ({ ...c, id: c.id ?? `c${i + 1}` })),
    contradictions: p.contradictions ?? p.crossModalConsistency.contradictions,
    evidenceLedger: p.evidenceLedger.map((e, i) => ({ ...e, id: e.id ?? `e${i + 1}`, name: e.name ?? e.filename ?? e.url ?? `Evidence ${i + 1}` })),
    externalVerification: {
      ...p.externalVerification,
      claimVerifications: hasSearch ? claimVerifications.map((cv, i) => ({ ...cv, claimId: cv.claimId ?? `c${cv.claimIndex ?? i}` })) : [],
      sourceReliabilityNote: hasSearch ? sourceReliabilityNote : "External verification unavailable (no API key). Confidence reduced.",
      unavailable: !hasSearch,
      enabled: hasSearch,
      perClaim: hasSearch ? claimVerifications.map((cv, i) => ({ claimId: cv.claimId ?? `c${cv.claimIndex ?? i}`, status: cv.status, notes: cv.notes ?? "", citations: cv.citations })) : undefined,
      reliabilityNote: sourceReliabilityNote,
    },
    executiveSummary: { ...p.executiveSummary, nextSteps: p.executiveSummary.nextSteps ?? p.executiveSummary.whatToDoNext },
    transparency: { ...p.transparency, analyzed: p.transparency.analyzed ?? p.transparency.whatWasAnalyzed, notAnalyzed: p.transparency.notAnalyzed ?? [] },
  };

  if (!Array.isArray(report.timeline?.events) || report.timeline.events.length === 0) {
    report.timeline = {
      ...(report.timeline ?? { timelineConfidence: 35 }),
      timelineConfidence: report.timeline?.timelineConfidence ?? 35,
      events: inputs.map((i, idx) => ({
        t: idx === 0 ? "T0" : `T0+${idx}`,
        label: `Evidence submitted: ${i.filename ?? i.url ?? `Evidence ${idx + 1}`} (${i.type})`,
        sourceIds: [`e${idx + 1}`],
        inferred: true,
      })),
    };
  }
  if (!hasSearch && report.executiveSummary.confidence > 70) {
    report.executiveSummary.confidence = Math.min(report.executiveSummary.confidence, 65);
  }

  const checkable = (report.claims ?? report.claimsDetected ?? []).filter((c) => c.checkability === "checkable").length;
  const totalClaims = (report.claims ?? report.claimsDetected ?? []).length;
  const checkableRatio = totalClaims ? checkable / totalClaims : 0;
  if (totalClaims > 0 && checkableRatio < 0.3) {
    report.executiveSummary.confidence = Math.min(report.executiveSummary.confidence, 55);
    report.confidence = report.executiveSummary.confidence;
    if (report.executiveSummary.verdict === "Likely True") {
      report.executiveSummary.verdict = "Mixed/Unclear";
      report.verdict = "Mixed/Unclear";
    }
  }

  const perClaim = report.externalVerification?.perClaim ?? report.externalVerification?.claimVerifications ?? [];
  const withCitations = perClaim.filter((c) => (c.citations?.length ?? 0) > 0);
  const disputed = perClaim.filter((c) => c.status === "Disputed");
  const disputedRatio = withCitations.length ? disputed.length / withCitations.length : 0;
  const manipulationHigh = (report.scores?.manipulationRisk ?? report.manipulationLikelihood?.aiGeneratedScore ?? 0) >= 70;
  const aiHigh = (report.scores?.aiLikelihood ?? report.aiAnalysis?.overallLikelihood ?? 0) >= 70;
  if (withCitations.length >= 3 && disputedRatio >= 0.6 && (manipulationHigh || aiHigh)) {
    const floor = report.executiveSummary.verdict === "Manipulated/Deceptive" ? 65 : 55;
    report.executiveSummary.confidence = Math.max(report.executiveSummary.confidence, floor);
    report.confidence = report.executiveSummary.confidence;
  }

  if (report.executiveSummary.verdict === "Manipulated/Deceptive" && (manipulationHigh || aiHigh)) {
    report.executiveSummary.confidence = Math.max(report.executiveSummary.confidence, 55);
    report.confidence = report.executiveSummary.confidence;
  }

  return { report, source: "live" };
}

const SEEDED_CITATIONS = [
  { title: "FTC Consumer Information – Scams", domain: "consumer.ftc.gov", snippet: "How to avoid inheritance and advance-fee scams.", link: "https://consumer.ftc.gov/articles/how-avoid-inheritance-scams" },
  { title: "FBI Internet Crime Report", domain: "ic3.gov", snippet: "Reporting and statistics on phishing and wire fraud.", link: "https://www.ic3.gov/" },
  { title: "Reuters – Fact Check", domain: "reuters.com", snippet: "No official confirmation of celebrity split at this time.", link: "https://www.reuters.com/" },
  { title: "AP News Verification", domain: "apnews.com", snippet: "Unverified claims should be treated as rumor until confirmed.", link: "https://apnews.com/" },
];

export function getSeededReport(inputs: NormalizedInput[], scenarioId?: string): TruthReport {
  const firstText = inputs[0]?.text?.slice(0, 500) ?? "";
  const isScam = /urgent|wire transfer|inheritance|lottery|click here|verify your account/i.test(firstText);
  const isViral = /breaking|unnamed source|insiders|share to spread/i.test(firstText);
  const isRelationship = /screenshot|Person A|Person B|Dec \d/i.test(firstText);
  const isAiMedia = /synthetic|AI-generated|confession script|unnatural cadence/i.test(firstText);
  const isMetaDemo = scenarioId === "meta-demo" || /demo video|AI vs real|segments/i.test(firstText);

  const verdict = isScam || isAiMedia ? "Manipulated/Deceptive" : "Mixed/Unclear";
  const confidence = isScam ? 88 : isAiMedia ? 72 : isViral ? 45 : 58;

  const claims = firstText
    ? [{ id: "c1", text: firstText.slice(0, 120) + "...", category: "general", checkability: "partially_checkable", importance: "medium" as const }]
    : [];
  const contradictions: TruthReport["crossModalConsistency"]["contradictions"] = [];
  if (scenarioId === "viral-news" || isViral) {
    contradictions.push({
      claimId: "c1",
      a: { source: "Article headline", detail: "Claims marriage over, breaking news." },
      b: { source: "Official sources", detail: "No official statement released." },
      severity: "medium",
      explanation: "Headline and unnamed sources contradict lack of official confirmation.",
    });
  }
  if (scenarioId === "relationship-screenshots" || isRelationship) {
    contradictions.push({
      claimId: "c1",
      a: { source: "Screenshot 1", detail: "Person B apologizes, admits mistake." },
      b: { source: "Screenshot 3", detail: "Person B says they have moved on." },
      severity: "low",
      explanation: "Timeline suggests shifting narrative; screenshots could be edited or out of order.",
    });
  }

  const whichParts: TruthReport["manipulationLikelihood"]["whichParts"] = [];
  const flaggedSegments: Array<
    | { modality: "video" | "audio"; startSec: number; endSec: number; reason: string; confidence: number }
    | { modality: "text"; snippet: string; reason: string; confidence: number }
    | { modality: "image"; regionHint: string; reason: string; confidence: number }
  > = [];
  if (scenarioId === "ai-media-clip" || isAiMedia) {
    whichParts.push(
      { type: "text", reason: "Declared synthetic script", quote: "Synthetic voice / AI-generated", start: 0, end: 10 },
      { type: "text", reason: "Repetitive phrasing and generic apology", quote: "I want to apologize to everyone affected", start: 10, end: 20 }
    );
    flaggedSegments.push(
      { modality: "text", snippet: "Synthetic voice / AI-generated", reason: "Declared synthetic script", confidence: 85 },
      { modality: "text", snippet: "I want to apologize to everyone affected", reason: "Repetitive phrasing", confidence: 72 }
    );
  }
  if (isMetaDemo) {
    whichParts.push(
      { type: "video", reason: "Likely AI-generated narration", start: 0, end: 45 },
      { type: "video", reason: "Real UI capture", start: 45, end: 90 },
      { type: "video", reason: "Possible synthetic voice segment", start: 90, end: 120 }
    );
    flaggedSegments.push(
      { modality: "video", startSec: 0, endSec: 45, reason: "Likely AI-generated narration", confidence: 78 },
      { modality: "video", startSec: 45, endSec: 90, reason: "Real UI capture", confidence: 85 },
      { modality: "video", startSec: 90, endSec: 120, reason: "Possible synthetic voice", confidence: 65 }
    );
  }

  const claimVerifications = claims.map((c, i) => ({
    claimId: c.id ?? `c${i + 1}`,
    claimIndex: i,
    status: isScam ? ("Disputed" as const) : ("Supported" as const),
    citations: SEEDED_CITATIONS.slice(0, 2).map((cit) => ({ ...cit, url: cit.link })),
  }));

  return {
    verdict: verdict as TruthReport["verdict"],
    confidence,
    scores: {
      consistency: 70,
      manipulationRisk: isScam || isAiMedia ? 75 : 35,
      bias: isScam ? 80 : isViral ? 60 : 30,
      scamRisk: isScam ? 95 : 25,
      timelineConfidence: 40,
      aiLikelihood: isAiMedia ? 75 : isScam ? 65 : 35,
    },
    aiAnalysis: {
      overallLikelihood: isAiMedia ? 75 : isScam ? 65 : 35,
      breakdownByModality: { text: isAiMedia ? 80 : 40, image: 0, audio: isAiMedia ? 70 : 0, video: isMetaDemo ? 60 : 0, link: 0, pdf: 0 },
      flaggedSegments,
      signals: isScam ? ["Urgency", "Persuasion tactics"] : isAiMedia ? ["Repetitive structure", "Declared synthetic"] : [],
    },
    executiveSummary: {
      verdict: verdict as TruthReport["executiveSummary"]["verdict"],
      confidence,
      why: [
        isScam ? "Scam-like language and urgency detected." : isAiMedia ? "Scripted/synthetic tone and markers detected." : "Evidence analyzed with limited heuristics (demo mode).",
        contradictions.length ? "Contradictions or missing context identified." : "Insufficient external verification in demo mode.",
        "Add GEMINI_API_KEY for full analysis.",
      ],
      whatToDoNext: [
        "Do not send money or credentials based on this content.",
        "Verify claims with official sources.",
        "Use full Truth Engine with API keys for production.",
      ],
      nextSteps: ["Verify with official sources.", "Do not act on unverified claims."],
    },
    claimsDetected: claims,
    claims,
    evidenceLedger: inputs.map((i, idx) => ({
      id: `e${idx + 1}`,
      type: i.type,
      name: i.filename ?? i.url ?? `Evidence ${idx + 1}`,
      filename: i.filename,
      url: i.url,
      keyFacts: ["Processed in demo mode"],
      extractedFacts: ["Processed in demo mode"],
      extractedTextPreview: i.text?.slice(0, 200),
      crossRefs: [`Evidence ${idx + 1}`],
    })),
    crossModalConsistency: {
      contradictions,
      missingContextFlags: ["Demo mode: limited analysis"],
      consistencyScore: 70,
    },
    contradictions,
    manipulationLikelihood: {
      aiGeneratedScore: isScam || isAiMedia ? 75 : 35,
      deepfakeSignals: isScam ? ["Urgency language"] : isAiMedia ? ["Scripted cadence"] : [],
      whichParts,
      signals: isScam ? ["Urgency", "Persuasion tactics"] : isAiMedia ? ["Repetitive structure", "Declared synthetic"] : [],
    },
    biasPersuasion: {
      biasScore: isScam ? 80 : isViral ? 60 : 30,
      persuasionTactics: isScam ? ["Urgency", "Authority"] : [],
      emotionalManipulation: [],
      scamRiskScore: isScam ? 95 : 25,
      explanation: isScam ? "Classic advance-fee scam patterns." : isViral ? "Clickbait and unverified claims." : "Limited bias signals in demo mode.",
    },
    timeline: {
      events: [],
      timelineConfidence: 40,
    },
    externalVerification: {
      claimVerifications,
      sourceReliabilityNote: "Demo mode: sample citations for illustration. Configure SEARCH_API_KEY for real verification.",
      unavailable: true,
      enabled: false,
      perClaim: claimVerifications.map((cv) => ({ claimId: cv.claimId, status: cv.status, notes: "", citations: cv.citations })),
      reliabilityNote: "Sample data only.",
    },
    transparency: {
      whatWasAnalyzed: inputs.map((i) => `${i.type}: ${i.filename ?? i.url ?? "pasted"}`),
      analyzed: inputs.map((i) => `${i.type}: ${i.filename ?? i.url ?? "pasted"}`),
      notAnalyzed: ["External search", "Full media parsing"],
      limitations: ["Demo mode", "No external search", "Heuristic-only when no API key"],
      safetyNote: "This report is for decision support only. It is not legal, medical, or professional advice. Verify critical claims independently.",
    },
  };
}
