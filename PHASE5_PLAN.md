# Phase 5 — AI Health Analysis Panel

## Context
RightPanel has an "Analyze →" button that switches to a placeholder mode. Phase 5 replaces that placeholder with a real streaming AI analysis powered by Claude via BAML. The analysis always synthesizes the full patient timeline (all sessions) so trajectory language like "9yr progression" is possible. Results are cached per component mount; a Regenerate button clears cache and re-fires.

**Decisions:**
- Scope: Always full timeline (all sessions passed as context)
- API key: `.env.local` → server-side only via Next.js Server Action
- Caching: Cache result in component state; explicit Regenerate button to re-run
- Voice Q&A is a future phase — not in scope here

---

## Stack

- `@boundaryml/baml` — BAML runtime + TypeScript client generator
- `@boundaryml/baml-nextjs-plugin` — wraps `next.config.ts`, generates Server Actions + React hooks
- `npx baml-cli generate` — regenerates `baml_client/` from `baml_src/*.baml`
- Claude `claude-sonnet-4-6` via Anthropic provider

---

## Work Order

### Step 1 — Install
```bash
npm install @boundaryml/baml @boundaryml/baml-nextjs-plugin
```
Update `package.json` build script:
```json
"build": "npx baml-cli generate && next build"
```

### Step 2 — `baml_src/` files (new)

**`baml_src/generators.baml`**
```baml
generator ts {
  output_type typescript
  output_dir "../baml_client"
  module_format "esm"
  version "0.223.0"
}
```

**`baml_src/clients.baml`**
```baml
client<llm> Claude {
  provider anthropic
  options {
    model "claude-sonnet-4-6"
    api_key env.ANTHROPIC_API_KEY
  }
}
```

**`baml_src/health_analysis.baml`**
```baml
class ConditionInsight {
  name        string
  trajectory  "stable" | "worsening" | "new" | "improving" | "chronic"
  was         string?
  now         string
  clinical    string
  urgency     "monitor" | "address_soon" | "urgent"
  @@stream.done
}

class LabInsight {
  marker         string
  value          string
  unit           string
  interpretation string
  @@stream.done
}

class HealthAnalysis {
  headline         string
  trajectory_score int
  primary_concerns ConditionInsight[]
  lab_highlights   LabInsight[]
  watchlist        string[]
  recommendations  string[]
}

function AnalyzeHealthRecord(patient_json: string) -> HealthAnalysis {
  client Claude
  prompt #"
    {{ ctx.output_format }}

    You are a fellowship-trained internist with 20+ years of clinical experience...
    [see health_analysis.baml for full system prompt]

    Patient data: {{ patient_json }}
  "#
}
```

### Step 3 — Generate `baml_client/`
```bash
npx baml-cli generate
```
Do not hand-edit `baml_client/` — it is auto-generated.

### Step 4 — `next.config.ts`
```typescript
import { withBaml } from '@boundaryml/baml-nextjs-plugin'
export default withBaml({})
```

### Step 5 — `.env.local`
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 6 — `src/components/AnalyzePanel.tsx` (new)
- Imports generated `useAnalyzeHealthRecord()` hook from `@/baml_client/react/client`
- Serializes all patient JSON (all sessions, all conditions, biomarkers, highlights)
- Streams `Partial<HealthAnalysis>` into structured UI sections
- Caches complete result in `useState`; Regenerate button clears + re-fires

**UI sections:**
1. Headline — streams word by word
2. Trajectory gauge — `trajectory_score / 10` bar, red→yellow→lime
3. Primary Concerns — `ConditionInsightCard` per item, pops in complete via `@@stream.done`
4. Lab Highlights — 2-col grid, pops in complete
5. Watchlist + Recommendations — bullet lists, grow progressively
6. Regenerate button — bottom, lime outline

**ConditionInsightCard:**
- Top color bar: red=urgent, yellow=address_soon, white/20=monitor
- Name `text-[13px] font-[400]`, was→now diff if `was` exists, clinical text `text-[10px] text-white/30`

### Step 7 — `src/components/RightPanel.tsx`
Replace placeholder `<div>` in analyze mode branch with `<AnalyzePanel />`.

---

## Files Changed

| File | Action |
|------|--------|
| `package.json` | Add baml-generate to build script |
| `next.config.ts` | Wrap with `withBaml` |
| `.env.local` | Add `ANTHROPIC_API_KEY` |
| `baml_src/generators.baml` | New |
| `baml_src/clients.baml` | New |
| `baml_src/health_analysis.baml` | New |
| `baml_client/` | Auto-generated |
| `src/components/AnalyzePanel.tsx` | New |
| `src/components/RightPanel.tsx` | Replace placeholder |
| `PHASE5_PLAN.md` | This file |

---

---

## Backlog

### [BACKLOG] Per-Section Clinical Citations with Source Links

**What:** Each `ConditionInsight` and `LabInsight` card in the analysis panel shows 1–3 citation chips below the clinical text. Clicking any chip opens the source in a new browser tab.

**Why:** Backs up the physician-voice claims with real literature — turns the analysis from "trust me" into "here's the evidence." Especially important for the high-stakes findings (basophilia → myeloproliferative workup, premature aortic calcification → ASCVD risk).

**The URL problem:** Claude cannot browse the internet or verify live URLs. Naively asking it to cite `pubmed.ncbi.nlm.nih.gov/12345678` will produce hallucinated DOIs. Two honest strategies:

- **PubMed search links (v1):** Claude generates a precise MeSH-style search term per finding (e.g., `"basophilia myeloproliferative neoplasm JAK2 BCR-ABL"`) and we construct `https://pubmed.ncbi.nlm.nih.gov/?term=<encoded-term>` — always resolves, always on-topic, never fabricated.
- **Stable guideline anchors (v1):** For well-known org guidelines (AHA, ACC, USPSTF, ESC, WHO) Claude provides org name + guideline title. We link to the org's known search URL. E.g. `https://www.heart.org/en/professional/quality-improvement` or `https://www.acc.org/guidelines`.
- **Two-phase web-search tool (v2):** After the main analysis call, a second Claude call with a `web_search` tool retrieves and verifies real DOIs and guideline URLs per finding. More accurate, costs a second round-trip and tool-use setup.

**Recommended rollout:**
- **v1:** Schema adds `references: Reference[]` to `ConditionInsight` and `LabInsight`. Each `Reference` has `{ title: string; url: string; source: string }`. System prompt instructs Claude to use only PubMed search links (`https://pubmed.ncbi.nlm.nih.gov/?term=...`) and known org guideline pages — never fabricate DOIs.
- **v2:** Second BAML function `EnrichWithCitations(analysis_json: string) -> CitationMap` with `web_search` tool use that verifies and replaces search links with exact paper URLs.

**BAML schema change (v1):**
```baml
class Reference {
  title  string   // Short paper/guideline title
  source string   // "PubMed" | "AHA" | "ACC" | "USPSTF" | etc.
  url    string   // PubMed search URL or stable org guideline URL
  @@stream.done
}

class ConditionInsight {
  // ... existing fields ...
  references Reference[]
}

class LabInsight {
  // ... existing fields ...
  references Reference[]
}
```

**UI change:**
- Below the `clinical` text in each `ConditionInsightCard`, render small citation chips:
  ```
  [PubMed]  [AHA Guideline]  [USPSTF]
  ```
- Each chip: `<a href={ref.url} target="_blank" rel="noopener noreferrer">` with glass-pill styling, `text-[9px]`, `text-white/30`, hover lifts to `text-lime/60`
- Chips only render when `references.length > 0` — no empty state needed

**Open questions before implementing:**
- Should citations be capped at 3 per card to avoid clutter?
- Should v1 launch with a "⚠ Search links, not verified DOIs" disclaimer tooltip?
- Does the system prompt need a few-shot example showing correct PubMed URL format?

---

## Verification

1. `npm run dev` starts without errors
2. `npx baml-cli generate` produces `baml_client/` with correct TypeScript types
3. "Analyze →" switches panel mode
4. "Generate Report" triggers streaming — headline appears first, word by word
5. Condition cards pop in complete (not mid-render) — confirms `@@stream.done`
6. Result persists after stream ends (no re-trigger on re-open)
7. Regenerate clears cache and fires fresh call
8. `ANTHROPIC_API_KEY` never visible in browser network tab
9. Both sessions work: 2026-02 (full data) and 2017-05 (3 skeletal only)
