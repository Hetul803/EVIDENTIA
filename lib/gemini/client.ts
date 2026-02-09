import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(message: string): number | null {
  const m = message.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  if (!m) return null;
  const sec = Number(m[1]);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.min(60000, Math.round(sec * 1000));
}

function shouldRetryGeminiError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\b429\b|\b503\b|quota|rate limit|temporarily unavailable/i.test(msg);
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function getGeminiClient(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

export async function generateContent(
  prompt: string,
  options?: { model?: string; jsonMode?: boolean }
): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY not configured");
  const modelId = options?.model ?? DEFAULT_MODEL;
  const model = client.getGenerativeModel({
    model: modelId,
    generationConfig: options?.jsonMode
      ? { responseMimeType: "application/json" }
      : undefined,
  });
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      if (!response.text) throw new Error("Empty Gemini response");
      return response.text();
    } catch (e) {
      if (attempt >= maxAttempts || !shouldRetryGeminiError(e)) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      const retryMs = parseRetryAfterMs(msg) ?? 1000 * attempt;
      await sleep(retryMs);
    }
  }
  throw new Error("Gemini request failed after retries");
}

export async function generateContentWithImage(
  prompt: string,
  imageData: { mimeType: string; data: string } // base64
): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY not configured");
  const model = client.getGenerativeModel({
    model: DEFAULT_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });
  const part = {
    inlineData: {
      mimeType: imageData.mimeType,
      data: imageData.data,
    },
  };
  const result = await model.generateContent([prompt, part]);
  const response = result.response;
  if (!response.text) throw new Error("Empty Gemini response");
  return response.text();
}

export async function generateContentWithParts(
  prompt: string,
  parts: Array<{ mimeType: string; data: string }>,
  options?: { model?: string; jsonMode?: boolean }
): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY not configured");
  const modelId = options?.model ?? DEFAULT_MODEL;
  const model = client.getGenerativeModel({
    model: modelId,
    generationConfig: options?.jsonMode
      ? { responseMimeType: "application/json" }
      : undefined,
  });
  const inlineParts = parts.map((p) => ({
    inlineData: {
      mimeType: p.mimeType,
      data: p.data,
    },
  }));
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent([prompt, ...inlineParts]);
      const response = result.response;
      if (!response.text) throw new Error("Empty Gemini response");
      return response.text();
    } catch (e) {
      if (attempt >= maxAttempts || !shouldRetryGeminiError(e)) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      const retryMs = parseRetryAfterMs(msg) ?? 1000 * attempt;
      await sleep(retryMs);
    }
  }
  throw new Error("Gemini request failed after retries");
}
