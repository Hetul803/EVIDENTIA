import fs from "fs";
import path from "path";

// Read an image file as base64 for Gemini.
export function imageToBase64(filePath: string): { mimeType: string; data: string } {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  const mimeType = mimeTypes[ext] ?? "image/jpeg";
  const buffer = fs.readFileSync(filePath);
  const data = buffer.toString("base64");
  return { mimeType, data };
}
