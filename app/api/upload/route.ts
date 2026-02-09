import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "file";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      key: safeName,
      path: filePath,
      filename: file.name,
      type: type as string,
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
