export const CITATIONS_SUMMARY_PROMPT = `You are a verification analyst. Map the following search results to claims and produce structured verification.

CLAIMS (indexed):
{claims}

SEARCH RESULTS (raw):
{searchResults}

Output a JSON object:
{
  "claimVerifications": [
    {
      "claimIndex": 0,
      "claimId": "c1",
      "status": "Supported" | "Disputed" | "Not found",
      "notes": "One short sentence explaining why the citations support/dispute or why none were found.",
      "citations": [
        { "title": "", "domain": "", "snippet": "", "link": "" }
      ]
    }
  ],
  "sourceReliabilityNote": "One sentence on reliability of sources."
}

Rules:
- Prefer citations that directly mention the entities/facts in the claim.
- If results are only tangential, set status to "Not found".
- Include 1-3 citations per claim (quality over quantity).

Return ONLY valid JSON, no markdown.`;
