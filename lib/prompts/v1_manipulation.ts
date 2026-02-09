export const MANIPULATION_SIGNALS_PROMPT = `You are a media forensics analyst. Analyze the following evidence for signs of AI generation, deepfake, or manipulation.

EVIDENCE:
---
{evidence}
---

Consider: compression artifacts, unnatural cadence, semantic inconsistencies, metadata anomalies, lip-sync cues, repetition patterns, emotional flatness, too-perfect grammar.

Output a JSON object with:
- aiGeneratedScore: number 0-100 (likelihood that content is AI-generated or manipulated)
- deepfakeSignals: array of strings (e.g. "unnatural lip movement", "audio drift")
- whichParts: array of objects. Each object:
  - For video/audio: type ("video"|"audio"), start (number, seconds), end (number, seconds), reason (string), confidence (0-100)
  - For text: type "text", reason (string), quote (string, the snippet), confidence (0-100)
  - For image: type "image", reason (string), regionHint (string, e.g. "upper left"), confidence (0-100)
  Use "start" and "end" in seconds for video/audio. If exact times unknown, use best estimate and set reason to include "estimated".
- signals: array of strings (all signals detected)

Always output arrays (use [] if none). Return ONLY valid JSON, no markdown.`;
