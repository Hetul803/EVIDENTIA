import { NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/gemini/client";
import { isExternalVerificationConfigured } from "@/lib/search/external";

// Status endpoint; never returns secrets.
export async function GET() {
  const gemini = isGeminiConfigured() ? "configured" : "not_configured";
  const search = isExternalVerificationConfigured() ? "configured" : "not_configured";
  return NextResponse.json({
    gemini,
    search,
    debug: {
      geminiKeyPresent: !!process.env.GEMINI_API_KEY,
      geminiModelPresent: !!process.env.GEMINI_MODEL,
      searchProvider: process.env.SEARCH_API_PROVIDER ?? "none",
      serpapiKeyPresent: !!process.env.SEARCH_API_KEY,
      tavilyKeyPresent: !!process.env.TAVILY_API_KEY,
    },
  });
}
