export const ADVERSARIAL_GENERATE_PROMPT = `You are a red-team researcher. Generate adversarial content for the following attack template. The goal is to create content that might fool a naive fact-checker (for defensive testing only).

ATTACK TEMPLATE: {template}

Generate realistic-looking content (e.g. scam email body, fake news article, edited screenshot narrative, or synthetic confession script) that fits the template. Output a JSON object:
{
  "content": "the full generated text/content",
  "script": "optional: if audio/video, the script to read",
  "warnings": ["list of red flags that a good detector should catch"]
}

Return ONLY valid JSON, no markdown.`;
