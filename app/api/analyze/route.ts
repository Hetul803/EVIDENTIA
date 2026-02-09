import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runOrchestrator, normalizeEvidence } from "@/lib/gemini/orchestrator";
import { isGeminiConfigured } from "@/lib/gemini/client";
import { extractTextFromHtml } from "@/lib/extractors/html";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const maxDuration = 60;

function resolvePath(item: { type: string; filePath?: string; uploadKey?: string; url?: string; text?: string }) {
  if (item.uploadKey) return path.join(UPLOAD_DIR, item.uploadKey);
  return item.filePath;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputs = body.inputs as Array<{
      type: string;
      filePath?: string;
      uploadKey?: string;
      url?: string;
      text?: string;
    }>;

    if (!inputs?.length) {
      return NextResponse.json(
        { error: "At least one evidence input required" },
        { status: 400 }
      );
    }

    const withPaths = await Promise.all(
      inputs.map(async (i) => {
        if (i.type === "link" && i.url && !i.text) {
          try {
            const res = await fetch(i.url, {
              headers: { "User-Agent": "EvidentiaBot/1.0" },
              signal: AbortSignal.timeout(10000),
            });
            const html = await res.text();
            const text = extractTextFromHtml(html);
            return { ...i, text: text || "[Could not fetch content]" };
          } catch {
            return { ...i, text: "[Failed to fetch URL]" };
          }
        }
        return {
          ...i,
          filePath: i.type !== "text" && i.type !== "link" ? resolvePath(i) : undefined,
        };
      })
    );

    const normalized = await Promise.all(
      withPaths.map((i) => normalizeEvidence(i))
    );

    const scenarioId = (body.scenarioId as string) || undefined;
    const mode = (body.mode as string) || "normal";
    const hasGemini = isGeminiConfigured();
    const result = await runOrchestrator(normalized, undefined, { scenarioId, mode });

    const reportToStore = {
      ...result.report,
      reportError: result.reportError,
      reportSource: result.source,
    };

    console.log("EVIDENTIA analyze", {
      hasGemini,
      mode,
      scenarioId: scenarioId ?? null,
      source: result.source,
      reportErrorCode: result.reportError?.code ?? null,
      reportErrorMessage: result.reportError?.message?.slice(0, 80) ?? null,
    });

    for (const i of withPaths) {
      const fp = i.type !== "text" && i.type !== "link" ? i.filePath : undefined;
      if (fp) {
        try {
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch {}
      }
    }

    return NextResponse.json({
      ok: true,
      report: reportToStore,
      source: result.source,
      reportError: result.reportError ?? null,
    });
  } catch (e) {
    console.error("Analyze error:", e);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
