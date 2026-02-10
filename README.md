# Evidentia — The AI Truth Engine

**Don’t trust the internet. Verify it.**

Evidentia is a multi-modal verification platform powered by **Gemini 3**, designed to analyze real-world evidence and produce structured, explainable credibility reports.

Unlike simple chatbots or RAG tools, Evidentia is an orchestration system that reasons across documents, text, links, and media to answer one question:

👉 **“Is this information trustworthy?”**

---

## What Evidentia Does

Upload or paste any evidence and Evidentia will:

- Extract and classify claims  
- Detect contradictions across sources  
- Identify manipulation and AI-generated signals  
- Analyze bias, persuasion, and scam risk  
- Build event timelines  
- Verify claims using external citations  
- Produce a structured, shareable **Truth Report**

All powered end-to-end by the **Gemini 3 API**.

---

## Why It’s Different

This is NOT:

- A simple chatbot  
- A prompt wrapper  
- Basic RAG  
- Generic document summarization  

Evidentia uses a **multi-step Gemini orchestration pipeline**:

**Ingest → Claim Extraction → Cross-Evidence Reasoning → Manipulation Detection → External Verification → Report Generation**

---

## Supported Evidence Types

- Pasted text  
- Web links  
- PDFs & documents  
- Images  
- Audio  
- Video  

All unified into a single credibility analysis workflow.

---

## Tech Stack

- **Next.js 14 + TypeScript**
- **TailwindCSS + Framer Motion**
- **Radix UI / shadcn components**
- **Zustand** state management
- **Zod** validation
- **Gemini 3 API**
- Optional: **SerpAPI / Tavily** for citation search

---

## Privacy-First Design

- No accounts required  
- No database  
- All reports live in browser memory  
- Refresh clears session  

---

## Setup

### Install
```bash
npm install
