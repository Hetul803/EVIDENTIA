// Scoring rubrics used by prompts and fallback scoring.

export const CONFIDENCE_RUBRIC = `
Confidence (0-100) is computed from:
- Evidence quantity: more diverse evidence → higher base
- Cross-modal consistency: no contradictions → +20; minor → +10; major → -20
- External verification: multiple supporting sources → +15; disputed → -15; none → 0
- Manipulation signals: none → 0; low → -10; high → -25
- Clamp final score to 0-100.
`;

export const AI_GENERATION_RUBRIC = `
AI-generation likelihood (0-100):
- Count signals: compression artifacts, unnatural cadence, semantic inconsistencies, metadata anomalies, lip-sync cues, repetition patterns.
- Each strong signal: +15-25. Each weak signal: +5-10.
- No signals: 0-15 (baseline uncertainty).
- Cap at 100.
`;

export const SCAM_RISK_RUBRIC = `
Scam risk (0-100):
- Urgency language: +15
- Request for money/credentials: +25
- Impersonation (authority, family): +20
- Too-good-to-be-true: +15
- Poor grammar + urgency: +10
- Known scam patterns (inheritance, lottery, support): +20
- Sum and cap at 100.
`;

export const BIAS_RUBRIC = `
Bias score (0-100):
- Loaded language / emotional words: +10 per instance
- One-sided sources only: +25
- Missing counterpoints: +15
- Persuasion tactics (bandwagon, authority appeal): +10 each
- Explain in plain language and list detected patterns.
`;

export const VERDICT_RUBRIC = `
Verdict one of: Likely True | Mixed/Unclear | Likely False | Manipulated/Deceptive
- Likely True: confidence >= 70, consistency high, no manipulation red flags.
- Mixed/Unclear: confidence 40-69 or conflicting evidence.
- Likely False: confidence < 40 or major contradictions.
- Manipulated/Deceptive: high AI-generation or deepfake signals, or evidence of editing.
`;
