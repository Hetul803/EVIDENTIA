import { NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/gemini/client";
import { isExternalVerificationConfigured } from "@/lib/search/external";

// Status endpoint; never returns secrets.
export async function GET() {
  const gemini = isGeminiConfigured() ? "configured" : "not_configured";
  const search = isExternalVerificationConfigured() ? "configured" : "not_configured";
  return NextResponse.json({ gemini, search });
}
