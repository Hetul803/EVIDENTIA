import type { TruthReport } from "./types";

export interface DemoScenarioPayload {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  payload: DemoScenarioPayload[];
  tags: string[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "scam-email",
    name: "Scam Email",
    description: "Urgent request for wire transfer with inheritance pretext",
    payload: [
      {
        type: "text",
        text: `Subject: URGENT - Your inheritance of $2,500,000 is waiting

Dear Beneficiary,

I am Barrister James Okonjo, legal representative of the late Mr. Robert Williams. Your name appeared as next of kin in his will. You are entitled to USD $2,500,000 (Two Million Five Hundred Thousand US Dollars).

Due to protocol we need you to provide your bank details and a processing fee of $350 to release the funds. This must be completed within 72 HOURS or the funds will be forfeited.

Reply immediately with:
- Full name
- Bank name and account number
- Phone number
- The $350 processing fee via Western Union to the details we will send

Do not miss this opportunity. Many claimants have already received their funds.

Yours faithfully,
Barrister James Okonjo`,
      },
    ],
    tags: ["scam", "email", "inheritance"],
  },
  {
    id: "viral-news",
    name: "Viral News Link",
    description: "Sensational headline with unverified claims",
    payload: [
      {
        type: "link",
        url: "https://example.com/article",
        text: `BREAKING: Celebrity Spotted at Secret Location - Sources Say Marriage Over

An unnamed source close to the couple claims the relationship has been in trouble for months. The article cites "multiple insiders" but no official statement has been released. Comments are disabled. Share to spread the word!`,
      },
    ],
    tags: ["news", "viral", "unverified"],
  },
  {
    id: "relationship-screenshots",
    name: "Relationship Screenshots",
    description: "Text transcripts simulating chat screenshots",
    payload: [
      {
        type: "text",
        text: "[Screenshot 1 - Dec 1] Person A: I can't believe you did that. Person B: I'm sorry, it was a mistake.",
      },
      {
        type: "text",
        text: "[Screenshot 2 - Dec 3] Person B: We need to talk. Person A: There's nothing to talk about.",
      },
      {
        type: "text",
        text: "[Screenshot 3 - Dec 5] Person A: I've been thinking. Maybe we can work this out. Person B: I've already moved on.",
      },
    ],
    tags: ["screenshots", "relationship", "social"],
  },
  {
    id: "ai-media-clip",
    name: "AI-Generated Media Clip",
    description: "Synthetic confession script for red-team testing",
    payload: [
      {
        type: "text",
        text: `[Transcript - Synthetic voice / AI-generated confession script]

"I am making this recording to confess that I was responsible for the incident. I acted alone. I want to apologize to everyone affected. The events described in the media are accurate. I have no further comment at this time."

[Note: This is a sample script designed to test Evidentia's detection of synthetic or scripted content. Unnatural cadence and repetitive phrasing are intentional.]`,
      },
    ],
    tags: ["ai", "audio", "synthetic"],
  },
];

export function getSeededReportForScenario(scenarioId: string): TruthReport {
  const base: TruthReport = {
    executiveSummary: {
      verdict: "Mixed/Unclear",
      confidence: 65,
      why: ["Demo scenario analyzed with heuristics.", "Configure GEMINI_API_KEY for full analysis.", "External verification not available."],
      whatToDoNext: ["Verify any claims with official sources.", "Do not send money or personal details.", "Use full analysis for production."],
    },
    claimsDetected: [],
    evidenceLedger: [],
    crossModalConsistency: { contradictions: [], missingContextFlags: [], consistencyScore: 70 },
    manipulationLikelihood: { aiGeneratedScore: 0, deepfakeSignals: [], whichParts: [], signals: [] },
    biasPersuasion: { biasScore: 0, persuasionTactics: [], emotionalManipulation: [], scamRiskScore: 0, explanation: "" },
    timeline: { events: [], timelineConfidence: 50 },
    externalVerification: { claimVerifications: [], sourceReliabilityNote: "Unavailable in demo.", unavailable: true },
    transparency: { whatWasAnalyzed: [], limitations: ["Demo mode"], safetyNote: "Not legal or professional advice." },
  };

  if (scenarioId === "scam-email") {
    base.executiveSummary = { verdict: "Manipulated/Deceptive", confidence: 88, why: ["Urgency and inheritance scam patterns.", "Request for fees and bank details.", "No verifiable legal entity."], whatToDoNext: ["Do not send money or details.", "Report to authorities.", "Ignore and delete."] };
    base.claimsDetected = [{ text: "User is beneficiary of $2.5M inheritance", category: "financial", checkability: "unverifiable", importance: "high" }];
    base.biasPersuasion = { biasScore: 80, persuasionTactics: ["Urgency", "Authority", "Too-good-to-be-true"], emotionalManipulation: ["FOMO"], scamRiskScore: 95, explanation: "Classic advance-fee scam patterns." };
  }
  if (scenarioId === "viral-news") {
    base.executiveSummary = { verdict: "Mixed/Unclear", confidence: 45, why: ["Unnamed sources only.", "No official statement.", "Sensational framing."], whatToDoNext: ["Wait for official confirmation.", "Check multiple sources.", "Avoid sharing unverified claims."] };
    base.biasPersuasion = { biasScore: 60, persuasionTactics: ["Anonymous sources"], emotionalManipulation: [], scamRiskScore: 20, explanation: "Clickbait and unverified claims." };
  }
  if (scenarioId === "relationship-screenshots") {
    base.executiveSummary = { verdict: "Mixed/Unclear", confidence: 50, why: ["Screenshots can be edited.", "No timestamps or metadata.", "One-sided narrative."], whatToDoNext: ["Request originals if relevant.", "Consider context.", "Don't rely on screenshots alone."] };
  }
  if (scenarioId === "ai-media-clip") {
    base.executiveSummary = { verdict: "Manipulated/Deceptive", confidence: 72, why: ["Scripted/synthetic tone.", "Generic phrasing.", "Demo script markers."], whatToDoNext: ["Treat as synthetic in tests.", "Verify any real-world claims elsewhere.", "Use for red-team only."] };
    base.manipulationLikelihood = { aiGeneratedScore: 75, deepfakeSignals: ["Scripted cadence"], whichParts: [{ type: "text", reason: "Declared synthetic script", quote: "Synthetic voice / AI-generated" }], signals: ["Repetitive structure", "Declared synthetic"] };
  }

  return base;
}
