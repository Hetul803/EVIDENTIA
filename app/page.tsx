"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { UploadDropzone } from "@/components/UploadDropzone";
import { Button } from "@/components/ui/button";
import { useAnalyzeStore } from "@/lib/store";
import type { EvidenceType } from "@/lib/types";

interface Status {
  gemini: "configured" | "not_configured";
  search: "configured" | "not_configured";
}

export default function HomePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "link" | "text">("upload");
  const addEvidence = useAnalyzeStore((s) => s.addEvidence);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setStatus(s as Status))
      .catch(() => setStatus({ gemini: "not_configured", search: "not_configured" }));
  }, []);

  const showDemo = status?.gemini !== "configured";

  const handleFiles = async (files: File[], type: EvidenceType) => {
    for (const file of files) {
      try {
        const form = new FormData();
        form.set("file", file);
        form.set("type", type);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (data?.key) {
          addEvidence({ type, filename: file.name, uploadKey: data.key });
        } else {
          addEvidence({ type, filename: file.name });
        }
      } catch {
        addEvidence({ type, filename: file.name });
      }
    }
    if (files.length) router.push("/analyze");
  };

  const handleLink = (url: string) => {
    addEvidence({ type: "link", url });
    router.push("/analyze");
  };

  const handleText = (text: string) => {
    addEvidence({ type: "text", text: text.slice(0, 100000) });
    router.push("/analyze");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          Evidentia
        </h1>
        <p className="text-xl text-muted">
          Don&apos;t trust the internet. Verify it.
        </p>
      </motion.div>

      <UploadDropzone
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFiles={handleFiles}
        onLink={handleLink}
        onText={handleText}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex flex-wrap justify-center gap-4"
      >
        <Link href="/analyze">
          <Button size="lg" className="bg-neon-cyan text-midnight font-semibold">
            Go to Analyze
          </Button>
        </Link>
        {showDemo ? (
          <Link href="/demo">
            <Button variant="secondary" size="lg">
              Demo Mode
            </Button>
          </Link>
        ) : null}
        <Link href="/adversarial">
          <Button variant="outline" size="lg">
            Adversarial Mode
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
