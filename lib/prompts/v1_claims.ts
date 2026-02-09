export const CLAIMS_EXTRACTION_PROMPT = `You are a forensic analyst. Extract atomic, checkable claims from the following evidence.

EVIDENCE:
---
{evidence}
---

Output a JSON object with a single key "claims" which is an array of objects. Each object has:
- id: string (short id e.g. "c1", "c2")
- text: string (the claim in one sentence)
- category: string (e.g. "factual", "financial", "temporal", "identity", "causal")
- checkability: string ("checkable" | "partially_checkable" | "opinion")
- importance: string ("low" | "medium" | "high")
- sourceEvidenceIds: string[] (e.g. ["e1","e3"], based on which evidence item(s) support the claim)

Rules:
- If the evidence is only a personal statement (e.g. "I received an email...") treat the meta-claim ("the user says they received...") as "partially_checkable" and avoid asserting the underlying world claim as fact.
- Prefer fewer, higher-quality claims.

Be concise. Extract only atomic claims (one fact per claim). Return ONLY valid JSON, no markdown.`;
