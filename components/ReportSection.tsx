"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ReportSection({
  title,
  children,
  defaultOpen = false,
}: ReportSectionProps) {
  return (
    <Accordion.Root type="single" collapsible defaultValue={defaultOpen ? "section" : undefined}>
      <Accordion.Item value="section" className="glass-card rounded-xl overflow-hidden">
        <Accordion.Header>
          <Accordion.Trigger className="group flex w-full items-center justify-between px-5 py-4 text-left font-medium text-foreground hover:bg-white/5 transition-colors data-[state=open]:border-b border-white/10">
            {title}
            <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="px-5 py-4 text-sm text-muted border-t border-white/5">
          {children}
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
