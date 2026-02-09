import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Video helpers (keyframes + optional audio extraction via ffmpeg).
const KEYFRAME_INTERVAL_SEC = 5;

function isFfmpegAvailable(): boolean {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function extractVideoKeyframes(
  filePath: string,
  outDir: string
): { frames: string[]; transcript?: string } {
  const frames: string[] = [];
  if (!fs.existsSync(filePath)) return { frames };

  if (!isFfmpegAvailable()) {
    return {
      frames: [],
      transcript: undefined,
    };
  }

  try {
    fs.mkdirSync(outDir, { recursive: true });
    const base = path.join(outDir, "frame_%04d.jpg");
    execSync(
      `ffmpeg -i "${filePath}" -vf "fps=1/${KEYFRAME_INTERVAL_SEC}" -q:v 2 "${base}"`,
      { stdio: "ignore", timeout: 60000 }
    );
    const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".jpg"));
    files.sort().forEach((f) => frames.push(path.join(outDir, f)));
  } catch (e) {
    console.error("Video keyframe extraction failed:", e);
  }
  return { frames };
}

export function extractVideoAudio(
  filePath: string,
  outDir: string
): { audioPath?: string } {
  if (!fs.existsSync(filePath)) return {};
  if (!isFfmpegAvailable()) return {};
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const audioPath = path.join(outDir, "audio.mp3");
    execSync(
      `ffmpeg -i "${filePath}" -vn -ac 1 -ar 16000 -b:a 64k -y "${audioPath}"`,
      { stdio: "ignore", timeout: 60000 }
    );
    if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
      return { audioPath };
    }
  } catch (e) {
    console.error("Video audio extraction failed:", e);
  }
  return {};
}

// Fallback text when keyframe extraction isn't available.
export function getVideoPlaceholderText(
  filePath: string,
  keyframePaths?: string[]
): string {
  const count = keyframePaths?.length ?? 0;
  if (count > 0) {
    return `[Video provided. ${count} keyframe(s) extracted for analysis.]`;
  }
  return "[Video file provided. Keyframe extraction not available (install ffmpeg for full analysis). Analysis will use metadata.]";
}
