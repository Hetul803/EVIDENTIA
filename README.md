# Evidentia — Truth Engine

**Don't trust the internet. Verify it.**

Evidentia is a futuristic, multi-modal "Truth Engine" that analyzes uploaded evidence (text, link, PDF, image, audio, video) using **Gemini** and produces a structured **Truth Report** with claim extraction, cross-modal consistency, manipulation likelihood, bias and persuasion signals, timeline reconstruction, external verification with citations, and an Adversarial Mode for red-teaming.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** + Framer Motion
- **shadcn-style** (Radix UI: Cards, Tabs, Progress, Accordion, Toast)
- **Zustand** (state) + **Zod** (validation)
- **Gemini API** (Google AI Studio / Vertex)
- Optional: **SerpAPI** or **Tavily** for external verification

## Install

```bash
npm install
```

## Configure

Copy `.env.example` to `.env` and set:

- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)
- `SEARCH_API_PROVIDER` — `tavily` or `serpapi` or `none`
- `TAVILY_API_KEY` (optional) — used when `SEARCH_API_PROVIDER=tavily`
- `SEARCH_API_KEY` (optional) — used when `SEARCH_API_PROVIDER=serpapi`

Privacy-first behavior:

- Reports are rendered from the browser session (no accounts, no DB).
- Refreshing the site clears evidence and reports.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing + upload (files, link, text) |
| `/analyze` | Evidence queue + pipeline + start analysis |
| `/report/session-*` | Truth Report saved for this browser session (refresh clears) |
| `/report/local` | Current report payload (used for quick navigation) |
| `/demo` | Demo Mode: 4 preloaded scenarios + Meta Demo (upload demo video) |
| `/adversarial` | Adversarial Mode: attack templates → generate → analyze |
| `/about` | Short explanation and safety notes |

## Demo Mode

Demo is only shown when `GEMINI_API_KEY` is not configured.

1. Go to **Demo**.
2. Choose one of the four scenarios: Scam Email, Viral News Link, Relationship Screenshots, AI-Generated Media Clip.
3. Click **Run analysis** — report opens (seeded or full analysis depending on keys).
4. **Meta Demo**: use **Go to Analyze and upload demo video** to upload your hackathon demo video; Evidentia will analyze it and flag segments that look AI vs real (when Gemini is configured).

## Deploy (Vercel)

- Add environment variables in Vercel Project Settings.
- This project is designed to be stateless by default.
- For video keyframes/audio extraction, the server needs `ffmpeg`. If Vercel does not provide it, video analysis will degrade gracefully.

## Judge walkthrough

1. **Home** — Show the hero and upload dropzone; add a link or paste text.
2. **Analyze** — Add evidence, click **Start analysis**. Optionally show **Evidence timeline** and **Stop analysis** / **Re-run**.
3. **Report** — Verdict and confidence; AI Generation Likelihood card with modality breakdown; score row with tooltips; Key findings; Contradictions (when present); Evidence ledger; Timeline; “Which parts are AI”; External verification; **Download JSON** / **Download PDF**.
4. **Demo** — Run Scam Email and AI-Generated Media Clip; show seeded report with contradictions and flagged segments.
5. **Adversarial** — Pick a template, **Generate**, then **Run Truth Report** to see detection.

## Demo script (3-minute video)

- **0:00–0:20** — Hook: “What you’re seeing could be AI-generated…”
- **0:20–0:35** — Reveal Evidentia + mission: “Don’t trust the internet. Verify it.”
- **0:35–0:50** — Homepage: “Upload anything” — show dropzone and tabs (Upload / Paste Link / Paste Text).
- **0:50–2:30** — Rapid demos: run all 4 demo scenarios, show verdict and score cards; then Adversarial Mode (pick template, generate, analyze).
- **2:30–3:00** — Meta demo: upload the demo video into Evidentia, show “AI vs Real segments” result; close with tagline.

---

Built for hackathon. Not legal/medical advice; use as decision support only.
