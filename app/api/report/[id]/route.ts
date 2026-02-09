import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isShareId = id.length <= 12 && !id.includes("-");
  const report = isShareId
    ? await prisma.report.findUnique({ where: { shareId: id } })
    : await prisma.report.findUnique({ where: { id } });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const json = JSON.parse(report.json);
  return NextResponse.json({
    id: report.id,
    shareId: report.shareId,
    createdAt: report.createdAt,
    title: report.title,
    verdict: report.verdict,
    confidence: report.confidence,
    mode: report.mode,
    report: json,
  });
}
