import fs from "fs";

export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    const mod = await import("pdf-parse");
    const PDFParse = (mod as { PDFParse: typeof import("pdf-parse").PDFParse }).PDFParse;
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
    try {
      const textResult = await parser.getText();
      return (textResult?.text ?? "").trim() || "[No text extracted from PDF]";
    } finally {
      await parser.destroy();
    }
  } catch (e) {
    console.error("PDF extract error:", e);
    return "[PDF extraction failed - file may be scanned/image-based]";
  }
}
