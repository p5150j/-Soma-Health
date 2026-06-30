import { z } from 'zod'

export const runtime = 'edge'

// ─── Zod schema — mirrors baml_client/types.ts exactly ───────────────────────

const ReferenceSchema = z.object({
  title:  z.string(),
  source: z.enum(['PubMed', 'arXiv', 'AHA', 'ACC', 'USPSTF', 'WHO', 'NIH', 'ESC']),
  query:  z.string(),
})

const ConditionInsightSchema = z.object({
  name:       z.string(),
  trajectory: z.enum(['stable', 'worsening', 'new', 'improving', 'chronic']),
  was:        z.string().nullable().optional(),
  now:        z.string(),
  clinical:   z.string(),
  urgency:    z.enum(['monitor', 'address_soon', 'urgent']),
  references: z.array(ReferenceSchema),
})

const LabInsightSchema = z.object({
  marker:         z.string(),
  value:          z.string(),
  unit:           z.string(),
  interpretation: z.string(),
  references:     z.array(ReferenceSchema),
})

const HealthAnalysisSchema = z.object({
  headline:         z.string(),
  trajectory_score: z.number().int().min(1).max(10),
  watchlist:        z.array(z.string()),
  recommendations:  z.array(z.string()),
  primary_concerns: z.array(ConditionInsightSchema),
  lab_highlights:   z.array(LabInsightSchema),
})

// ─── Prompt ──────────────────────────────────────────────────────────────────

const OUTPUT_FORMAT = `\
Respond with ONLY a valid JSON object — no markdown fences, no explanatory text.

Hard limits (strictly enforce — this is a streaming budget constraint):
- primary_concerns: maximum 4 items, ordered by urgency descending
- lab_highlights: maximum 4 items, most clinically significant first
- references per item: exactly 1
- clinical text: 2 sentences maximum — be direct, no padding

{
  "headline": string,
  "trajectory_score": integer 1–10,
  "watchlist": string[],
  "recommendations": string[],
  "primary_concerns": Array<{
    "name": string,
    "trajectory": "stable"|"worsening"|"new"|"improving"|"chronic",
    "was": string|null,
    "now": string,
    "clinical": string,
    "urgency": "monitor"|"address_soon"|"urgent",
    "references": Array<{"title":string,"source":"PubMed"|"arXiv"|"AHA"|"ACC"|"USPSTF"|"WHO"|"NIH"|"ESC","query":string}>
  }>,
  "lab_highlights": Array<{
    "marker": string,
    "value": string,
    "unit": string,
    "interpretation": string,
    "references": Array<{"title":string,"source":"PubMed"|"arXiv"|"AHA"|"ACC"|"USPSTF"|"WHO"|"NIH"|"ESC","query":string}>
  }>
}`

const CLINICAL_PROMPT = `\
You are a fellowship-trained internist with 20+ years of clinical experience. You trained at
Johns Hopkins, completed a fellowship in musculoskeletal and metabolic medicine, and have
published peer-reviewed work on spinal degeneration and cardiovascular risk markers. You are
known among colleagues and patients for telling the actual clinical picture — not hedged,
corporate-medicine language.

Your communication style:
- Reference every finding by its anatomical name and ICD-10 label — never vague shorthand
- Draw cross-signal connections across systems (e.g. premature aortic calcification + declining
  testosterone + elevated insulin = compounding cardiovascular risk that each finding alone understates)
- When a trajectory is worsening over years, say so plainly and convey urgency proportional to risk
- trajectory_score must be honest: 1=active crisis, 10=optimal health. A patient with L5 nerve root
  impingement and 9 years of progressive disc degeneration is not scoring above a 4.
- primary_concerns: order by urgency descending — the thing that needs action first comes first
- watchlist: things that are not yet alarming but warrant monitoring — keep entries short
- recommendations: specific and immediately actionable ("Schedule lumbar MRI within 30 days with
  attention to L4–L5 and L5–S1 foraminal stenosis", not "see a doctor about your back")
- headline: one punchy sentence that captures the overall clinical picture — no padding
- watchlist and recommendations are REQUIRED — always output them even if you must keep references brief

For each ConditionInsight and LabInsight, include 1–2 references that back up the clinical commentary:
- source must be one of: PubMed, arXiv, AHA, ACC, USPSTF, WHO, NIH, ESC
- query is a precise search string a researcher would type — MeSH-style for PubMed, plain terms for others
  Examples: "L5 S1 disc herniation nerve root impingement outcomes", "basophilia JAK2 BCR-ABL myeloproliferative neoplasm",
  "premature aortic calcification cardiovascular risk young adults", "testosterone deficiency metabolic syndrome ASCVD"
- title is a short human-readable chip label: "Disc herniation outcomes", "Basophilia workup", "ASCVD risk guidelines"
- NEVER invent a DOI, PMID, or paper URL — query terms are all that is needed, the app constructs the URL
- Prefer PubMed for clinical/lab findings, arXiv for newer ML-adjacent research, AHA/ACC/USPSTF for guideline-backed recommendations`

// ─── Incremental JSON closer ──────────────────────────────────────────────────
// Attempts to "close" a partial JSON string into something parseable.
// This lets us emit live partial state on every SSE token.

function attemptClose(text: string): string | null {
  const stack: string[] = []
  let inStr = false
  let esc   = false

  for (const c of text) {
    if (esc)               { esc = false; continue }
    if (c === '\\' && inStr) { esc = true;  continue }
    if (c === '"')         { inStr = !inStr; continue }
    if (inStr)             continue
    if (c === '{')         stack.push('}')
    else if (c === '[')    stack.push(']')
    else if ((c === '}' || c === ']') && stack.length) stack.pop()
  }

  if (!stack.length) return text // already valid JSON

  let out = text.trimEnd()
  if (inStr) out += '"'            // close open string
  out = out.replace(/[,:\s]+$/, '') // drop trailing orphan comma/colon
  return out + stack.reverse().join('')
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { patient_json } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500 })
  }

  const encoder = new TextEncoder()

  const outStream = new ReadableStream({
    async start(ctrl) {
      const emit = (msg: object) =>
        ctrl.enqueue(encoder.encode(JSON.stringify(msg) + '\n'))

      try {
        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type':      'application/json',
            'x-api-key':         apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      'claude-sonnet-4-6',
            max_tokens: 4096,
            stream:     true,
            messages: [{
              role:    'user',
              content: `${OUTPUT_FORMAT}\n\n${CLINICAL_PROMPT}\n\nPatient data (full history across all visits):\n${patient_json}`,
            }],
          }),
        })

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text()
          emit({ error: `Upstream ${upstream.status}: ${errText}` })
          ctrl.close()
          return
        }

        const reader  = upstream.body.getReader()
        const dec     = new TextDecoder()
        let buf       = ''
        let rawText   = ''
        let lastJson  = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') continue
            try {
              const ev = JSON.parse(payload)
              if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
                rawText += ev.delta.text ?? ''

                // Find the start of the JSON object (skip any markdown prefix)
                const jsonStart = rawText.indexOf('{')
                if (jsonStart === -1) continue

                const jsonPart = rawText.slice(jsonStart)
                const closed   = attemptClose(jsonPart)
                if (!closed || closed === lastJson) continue

                try {
                  const partial = JSON.parse(closed)
                  emit({ partial })
                  lastJson = closed
                } catch { /* not parseable yet — wait for more tokens */ }
              }
            } catch { /* skip malformed SSE line */ }
          }
        }

        // Final — strip markdown fences, Zod validate
        const jsonStart = rawText.indexOf('{')
        const jsonEnd   = rawText.lastIndexOf('}')
        if (jsonStart === -1 || jsonEnd === -1) {
          emit({ error: 'No JSON found in response' })
          ctrl.close()
          return
        }
        const raw   = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1))
        const final = HealthAnalysisSchema.parse(raw)
        emit({ final })
      } catch (e) {
        emit({ error: String(e) })
      }
      ctrl.close()
    },
  })

  return new Response(outStream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}
