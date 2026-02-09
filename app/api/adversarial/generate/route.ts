import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini/client";
import { ADVERSARIAL_GENERATE_PROMPT } from "@/lib/prompts/v1_adversarial";

export async function POST(request: NextRequest) {
  try {
    const { template } = await request.json();
    if (!template || typeof template !== "string") {
      return NextResponse.json({ error: "template required" }, { status: 400 });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json({
        content: "[Configure GEMINI_API_KEY to generate adversarial content.]",
        warnings: ["No API key configured."],
      });
    }

    const prompt = ADVERSARIAL_GENERATE_PROMPT.replace("{template}", template);
    const raw = await generateContent(prompt, { jsonMode: true });
    const cleaned = raw.replace(/^```json?\s*|\s*```$/g, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json({
      content: data.content ?? "",
      script: data.script,
      warnings: data.warnings ?? [],
    });
  } catch (e) {
    console.error("Adversarial generate error:", e);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
