"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { EvidenceType } from "@/lib/types";

interface UploadDropzoneProps {
  onFiles: (files: File[], type: EvidenceType) => void;
  onLink?: (url: string) => void;
  onText?: (text: string) => void;
  activeTab: "upload" | "link" | "text";
  onTabChange: (tab: "upload" | "link" | "text") => void;
  accept?: string;
}

export function UploadDropzone({
  onFiles,
  onLink,
  onText,
  activeTab,
  onTabChange,
  accept = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.mp4,.mov,.txt",
}: UploadDropzoneProps) {
  const [drag, setDrag] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [textInput, setTextInput] = useState("");

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) {
        const type = inferType(files[0].name);
        onFiles(files, type);
      }
    },
    [onFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length) {
        const type = inferType(files[0].name);
        onFiles(files, type);
      }
      e.target.value = "";
    },
    [onFiles]
  );

  const submitLink = () => {
    const url = linkInput.trim();
    if (url) onLink?.(url);
    setLinkInput("");
  };

  const submitText = () => {
    const text = textInput.trim();
    if (text) onText?.(text);
    setTextInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 space-y-6"
    >
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {(["upload", "link", "text"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
              activeTab === tab ? "bg-neon-cyan/20 text-neon-cyan" : "text-muted hover:text-foreground"
            )}
          >
            {tab === "upload" ? "Upload" : tab === "link" ? "Paste Link" : "Paste Text"}
          </button>
        ))}
      </div>

      {activeTab === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
            drag ? "border-neon-cyan/50 bg-neon-cyan/5" : "border-white/20 hover:border-white/30"
          )}
        >
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer block">
            <p className="text-foreground font-medium mb-1">Drop files here or click to upload</p>
            <p className="text-sm text-muted">PDF, Image, Audio, Video, Text</p>
          </label>
        </div>
      )}

      {activeTab === "link" && (
        <div className="space-y-2">
          <input
            type="url"
            placeholder="https://..."
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitLink()}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
          />
          <button
            onClick={submitLink}
            className="px-4 py-2 rounded-xl bg-neon-cyan text-midnight font-medium hover:bg-neon-cyan/90"
          >
            Add link for analysis
          </button>
        </div>
      )}

      {activeTab === "text" && (
        <div className="space-y-2">
          <textarea
            placeholder="Paste text evidence..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={5}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 resize-none"
          />
          <button
            onClick={submitText}
            className="px-4 py-2 rounded-xl bg-neon-cyan text-midnight font-medium hover:bg-neon-cyan/90"
          >
            Add text for analysis
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {["text", "link", "pdf", "image", "audio", "video"].map((t) => (
          <span
            key={t}
            className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-muted capitalize"
          >
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function inferType(filename: string): EvidenceType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp3", "wav"].includes(ext)) return "audio";
  if (["mp4", "mov"].includes(ext)) return "video";
  return "text";
}
