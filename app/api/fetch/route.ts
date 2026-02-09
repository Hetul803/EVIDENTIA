import { NextRequest, NextResponse } from "next/server";
import { extractTextFromHtml } from "@/lib/extractors/html";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }
    const res = await fetch(url, {
      headers: { "User-Agent": "EvidentiaBot/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const text = extractTextFromHtml(html);
    return NextResponse.json({
      ok: true,
      url,
      text: text || "[Could not extract main content]",
    });
  } catch (e) {
    console.error("Fetch error:", e);
    return NextResponse.json(
      { error: "Failed to fetch URL" },
      { status: 500 }
    );
  }
}
