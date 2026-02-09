"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Analyze" },
  { href: "/adversarial", label: "Adversarial" },
  { href: "/about", label: "About" },
];

interface Status {
  gemini: "configured" | "not_configured";
  search: "configured" | "not_configured";
}

export function NavBar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setStatus(s as Status))
      .catch(() => setStatus({ gemini: "not_configured", search: "not_configured" }));
  }, []);

  const items = useMemo(() => {
    const showDemo = status?.gemini !== "configured";
    return showDemo ? [...nav.slice(0, 2), { href: "/demo", label: "Demo" }, ...nav.slice(2)] : nav;
  }, [status]);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight text-foreground hover:text-neon-cyan transition-colors">
          Evidentia
        </Link>
        <div className="flex items-center gap-1">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "text-neon-cyan bg-white/5" : "text-muted hover:text-foreground hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
