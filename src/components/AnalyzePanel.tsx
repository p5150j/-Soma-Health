'use client'
import { useState, useCallback, useEffect } from 'react'
import type { HealthAnalysis, ConditionInsight, LabInsight, Reference } from 'baml_client/types'
import type { partial_types } from 'baml_client/partial_types'
import conditionsData     from '@/data/conditions_real.json'
import conditionsOrgans   from '@/data/conditions_organs.json'
import biomarkersData     from '@/data/biomarkers.json'
import labHighlightsData  from '@/data/lab-highlights.json'

type StreamData = partial_types.HealthAnalysis | HealthAnalysis

const URGENCY_LABEL: Record<ConditionInsight['urgency'], string> = {
  urgent:       'URGENT',
  address_soon: 'WATCH',
  monitor:      'MONITOR',
}

const URGENCY_COLOR: Record<ConditionInsight['urgency'], string> = {
  urgent:       'text-red-alert',
  address_soon: 'text-yellow-warn',
  monitor:      'text-white/25',
}

const TRAJECTORY_COLOR: Record<ConditionInsight['trajectory'], string> = {
  worsening: 'text-red-alert',
  new:       'text-yellow-warn',
  stable:    'text-white/40',
  improving: 'text-lime',
  chronic:   'text-white/30',
}

const TRAJECTORY_GLYPH: Record<ConditionInsight['trajectory'], string> = {
  worsening: '↘',
  new:       '●',
  stable:    '→',
  improving: '↗',
  chronic:   '◦',
}

function buildPatientJson(): string {
  return JSON.stringify({
    patientId:  conditionsData.patientId,
    sessions:   conditionsData.sessions,
    skeletal:   conditionsData.conditions,
    organs:     conditionsOrgans.conditions,
    biomarkers: biomarkersData.biomarkers,
    highlights: labHighlightsData.highlights,
  })
}

const SCORE_WIDTH = ['w-[10%]','w-[20%]','w-[30%]','w-[40%]','w-[50%]','w-[60%]','w-[70%]','w-[80%]','w-[90%]','w-full']

function scoreColor(score: number): string {
  if (score <= 3) return 'bg-red-alert'
  if (score <= 6) return 'bg-yellow-warn'
  return 'bg-lime'
}

const SOURCE_URL: Record<string, (q: string) => string> = {
  PubMed:  q => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`,
  arXiv:   q => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all`,
  AHA:     q => `https://www.heart.org/en/search?q=${encodeURIComponent(q)}`,
  ACC:     q => `https://www.acc.org/search#q=${encodeURIComponent(q)}`,
  USPSTF:  q => `https://www.uspreventiveservicestaskforce.org/uspstf/search_recommendations?q=${encodeURIComponent(q)}`,
  WHO:     q => `https://www.who.int/search?query=${encodeURIComponent(q)}`,
  NIH:     q => `https://www.nih.gov/search/results?q=${encodeURIComponent(q)}`,
  ESC:     q => `https://www.escardio.org/Search?query=${encodeURIComponent(q)}`,
}

function CitationChips({ refs }: { refs?: Reference[] }) {
  if (!refs?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-white/6">
      {refs.map((ref, i) => {
        const build = SOURCE_URL[ref.source] ?? SOURCE_URL.PubMed
        const href  = build(ref.query)
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={ref.title}
            className="px-2 py-0.5 rounded-full border border-white/10 text-[8px] font-[400] tracking-wide text-white/30 hover:text-lime/70 hover:border-lime/25 transition-colors"
          >
            {ref.source}
          </a>
        )
      })}
    </div>
  )
}

function BulletText({ text }: { text: string }) {
  const idx = text.indexOf(' — ')
  if (idx === -1) return <>{text}</>
  return <>
    <span className="font-[500] text-white/75">{text.slice(0, idx)}</span>
    <span className="text-white/35"> — {text.slice(idx + 3)}</span>
  </>
}

function ConditionCard({ item }: { item: ConditionInsight }) {
  return (
    <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 px-4 pt-3.5 pb-4 flex flex-col gap-3">

      {/* Header: name + urgency status */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-[14px] font-[400] text-white/90 leading-tight tracking-[-0.01em]">{item.name}</span>
        <span className={`text-[8px] font-[600] tracking-[0.14em] uppercase shrink-0 mt-0.5 ${URGENCY_COLOR[item.urgency]}`}>
          {URGENCY_LABEL[item.urgency]}
        </span>
      </div>

      {/* Hairline divider */}
      <div className="h-px bg-white/8" />

      {/* Instrument-panel metric rows */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[8px] font-[500] text-white/20 uppercase tracking-[0.1em]">Trajectory</span>
          <span className={`text-[10px] font-[400] ${TRAJECTORY_COLOR[item.trajectory]}`}>
            {TRAJECTORY_GLYPH[item.trajectory]}&nbsp;{item.trajectory}
          </span>
        </div>
        {item.was && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[8px] font-[500] text-white/20 uppercase tracking-[0.1em] shrink-0">Before</span>
            <span className="text-[10px] font-[300] text-white/35 text-right leading-snug">{item.was}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[8px] font-[500] text-white/20 uppercase tracking-[0.1em] shrink-0">Status</span>
          <span className="text-[10px] font-[300] text-white/60 text-right leading-snug">{item.now}</span>
        </div>
      </div>

      {/* Clinical footnote */}
      <p className="text-[10px] font-[300] text-white/25 leading-relaxed border-t border-white/6 pt-2.5">
        {item.clinical}
      </p>

      <CitationChips refs={item.references} />

    </div>
  )
}

function LabCard({ item }: { item: LabInsight }) {
  return (
    <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-[400] text-white/80 leading-none">{item.marker}</span>
        <span className="text-[11px] font-[500] text-lime shrink-0">{item.value}<span className="text-[9px] font-[300] text-white/30 ml-0.5">{item.unit}</span></span>
      </div>
      <p className="text-[10px] font-[300] text-white/30 leading-relaxed">{item.interpretation}</p>
      <CitationChips refs={item.references} />
    </div>
  )
}

const LOADING_MESSAGES = [
  'Running deep brief…',
  'Checking if it\'s lupus… (it\'s never lupus)',
  'Bypassing prior authorization…',
  'Consulting 175 billion parameters about your testosterone…',
  'Your L5 disc has entered the chat…',
  'Doing math on your mortality. Briefly.',
  'Tokenizing your suffering…',
  'Synthesizing what three specialists missed…',
  'Attending the grand rounds you weren\'t invited to…',
  'Performing a differential diagnosis at the speed of silicon…',
  'The algorithm is concerned. Professionally.',
  'Running the labs your insurance denied…',
  'Asking the LLM to be less corporate about your BMI…',
  'Your aorta and your cholesterol are in a meeting…',
  'Gradient descending into your medical history…',
  'Definitely not hallucinating your symptoms…',
  'Synthesizing 9 years of deferred appointments…',
  'Skipping the "everything looks fine" part…',
  'Co-pay: $0. Honesty: incoming.',
  'The model has opinions about your lumbar spine…',
  'Checking if it\'s stress… (it\'s also stress)',
  'Running 40,000 tokens through your bloodwork…',
  'Performing evidence-based speculation…',
  'Your biomarkers have entered the context window…',
  'Decoding the things your doctor glossed over…',
  'Computing the cross-system signals no one connected…',
  'Fine-tuning the diagnosis… and the doom…',
  'Not a doctor. Definitely not. But here we go…',
  'Overriding corporate-medicine hedging…',
  'Your cortisol is high and so are our compute costs…',
]

function CyclingMessage() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % LOADING_MESSAGES.length)
        setVisible(true)
      }, 300)
    }, 2600)
    return () => clearInterval(cycle)
  }, [])

  return (
    <p
      className="text-[10px] font-[300] text-lime/50 tracking-wide text-center px-6 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {LOADING_MESSAGES[idx]}
    </p>
  )
}

export function AnalyzePanel() {
  const [streaming, setStreaming]   = useState<StreamData | null>(null)
  const [cached,    setCached]      = useState<HealthAnalysis | null>(null)
  const [loading,   setLoading]     = useState(false)
  const [error,     setError]       = useState<string | null>(null)

  const display = cached ?? streaming

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    setStreaming(null)
    setCached(null)

    try {
      const res = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patient_json: buildPatientJson() }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const msg = JSON.parse(trimmed) as { partial?: StreamData; final?: HealthAnalysis; error?: unknown }
            if (msg.partial) setStreaming(msg.partial)
            if (msg.final)   setCached(msg.final)
          } catch { /* skip malformed line */ }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const regenerate = useCallback(() => {
    setCached(null)
    setStreaming(null)
    run()
  }, [run])

  if (!display && !loading && !error) {
    return (
      <div className="flex-1 glass-panel backdrop-blur-[40px] backdrop-saturate-150 relative overflow-hidden min-h-0">

        {/* scrolling terminal background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none px-5 pt-4">
          <div className="brief-terminal flex flex-col gap-[5px]">
            {([
              '→ initializing synthesis engine',
              'loading patient record [P-20240312]',
              'parsing timeline: 2017-05 → 2026-02',
              'found 2 clinical sessions',
              'indexing skeletal_conditions.json',
              '  nodes: 14  severity_flags: 3',
              'indexing organ_conditions.json',
              '  nodes: 12  severity_flags: 2',
              'loading biomarkers.json',
              '  markers: 43  flagged: 6',
              'computing 9yr trajectory window',
              'L5–S1 disc: severity escalation ↑',
              'lumbar_stenosis: chronic  progression: confirmed',
              'testosterone: −38% Δ over 9yr',
              'HDL: 38 mg/dL  status: below_threshold',
              'cortisol: elevated × 2 sessions',
              'aortic_calcification: risk vector flagged',
              'BMD T-score: −2.4  classification: osteoporosis',
              'cross-referencing ICD-10 taxonomy ... done',
              'running multi-system anomaly detection',
              'computing primary concern rankings',
              'scoring overall trajectory [1–10 scale]',
              'synthesizing watchlist entries',
              'generating actionable recommendations',
              'cross-referencing: AHA  ESC  NIH  USPSTF',
              'compiling citation index',
              '→ pipeline ready — awaiting instruction',
              '',
            ] as string[]).concat([
              '→ initializing synthesis engine',
              'loading patient record [P-20240312]',
              'parsing timeline: 2017-05 → 2026-02',
              'found 2 clinical sessions',
              'indexing skeletal_conditions.json',
              '  nodes: 14  severity_flags: 3',
              'indexing organ_conditions.json',
              '  nodes: 12  severity_flags: 2',
              'loading biomarkers.json',
              '  markers: 43  flagged: 6',
              'computing 9yr trajectory window',
              'L5–S1 disc: severity escalation ↑',
              'lumbar_stenosis: chronic  progression: confirmed',
              'testosterone: −38% Δ over 9yr',
              'HDL: 38 mg/dL  status: below_threshold',
              'cortisol: elevated × 2 sessions',
              'aortic_calcification: risk vector flagged',
              'BMD T-score: −2.4  classification: osteoporosis',
              'cross-referencing ICD-10 taxonomy ... done',
              'running multi-system anomaly detection',
              'computing primary concern rankings',
              'scoring overall trajectory [1–10 scale]',
              'synthesizing watchlist entries',
              'generating actionable recommendations',
              'cross-referencing: AHA  ESC  NIH  USPSTF',
              'compiling citation index',
              '→ pipeline ready — awaiting instruction',
              '',
            ]).map((line, i) => (
              <p key={i} className={`font-mono text-[9px] leading-relaxed whitespace-pre ${
                line.startsWith('→') ? 'text-lime/35' : line.startsWith('  ') ? 'text-white/10' : 'text-white/15'
              }`}>{line || ' '}</p>
            ))}
          </div>
        </div>

        {/* fade masks top + bottom */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[rgba(18,18,20,0.9)] to-transparent pointer-events-none z-10"/>
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[rgba(18,18,20,0.95)] to-transparent pointer-events-none z-10"/>

        {/* content — dead center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 z-20">
          <p className="text-[11px] font-[300] text-white/40 text-center leading-relaxed">
            ML synthesis across your full medical history —<br/>every visit, every system, every signal.
          </p>
          <button
            onClick={run}
            className="mt-1 px-8 py-3 bg-lime text-black text-[12px] font-[500] rounded-full hover:bg-lime/90 active:scale-[0.98] transition-all"
          >
            Start Brief Pipeline →
          </button>
        </div>

      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex flex-col items-center justify-center gap-3 min-h-0">
        <p className="text-[11px] font-[300] text-red-alert/70 text-center px-8">{error}</p>
        <button onClick={run} className="px-4 py-1.5 text-[11px] font-[300] text-white/40 border border-white/10 rounded-full hover:text-white/60 transition-colors">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 relative flex flex-col gap-3">

      {/* Full-panel spinner overlay — stays until stream fully done */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[rgba(8,8,8,0.35)] backdrop-blur-[2px] rounded-2xl">
          <div className="w-6 h-6 rounded-full border-2 border-lime/20 border-t-lime animate-spin" />
          <CyclingMessage />
        </div>
      )}

      {/* Scrollable content beneath overlay */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-3">

      {/* Headline */}
      {display?.headline && (
        <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 px-4 py-3">
          <p className="text-[13px] font-[300] text-white/75 leading-relaxed">
            {display.headline}
          </p>
        </div>
      )}

      {/* Trajectory score */}
      {display?.trajectory_score != null && (
        <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-[500] uppercase tracking-widest text-white/25">Overall Trajectory</span>
            <span className="text-[12px] font-[400] text-white/70">{display.trajectory_score}<span className="text-[9px] text-white/25">/10</span></span>
          </div>
          <div className="w-full h-[3px] bg-white/8 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${scoreColor(display.trajectory_score)} ${SCORE_WIDTH[Math.min(display.trajectory_score, 10) - 1] ?? 'w-[10%]'}`} />
          </div>
        </div>
      )}

      {/* Watchlist + Recommendations — schema order: generated before heavy card arrays */}
      {((display?.watchlist?.length ?? 0) > 0 || (display?.recommendations?.length ?? 0) > 0) && (
        <div className="flex flex-col gap-2">
          {(display?.watchlist?.length ?? 0) > 0 && (
            <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 px-4 py-4 flex flex-col gap-3">
              <span className="text-[11px] font-[500] uppercase tracking-widest text-lime">Watchlist</span>
              <ul className="flex flex-col gap-2">
                {display!.watchlist.map((item, i) => (
                  <li key={i} className="text-[11px] font-[300] leading-snug flex gap-2">
                    <span className="text-white/25 shrink-0 mt-px">·</span><span><BulletText text={item} /></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(display?.recommendations?.length ?? 0) > 0 && (
            <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 px-4 py-4 flex flex-col gap-3">
              <span className="text-[11px] font-[500] uppercase tracking-widest text-lime">Actions</span>
              <ul className="flex flex-col gap-2">
                {display!.recommendations.map((item, i) => (
                  <li key={i} className="text-[11px] font-[300] leading-snug flex gap-2">
                    <span className="text-lime/50 shrink-0 mt-px">→</span><span><BulletText text={item} /></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Primary concerns */}
      {(display?.primary_concerns?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-[500] uppercase tracking-widest text-white/25 px-1">Primary Concerns</span>
          <div className="flex flex-col gap-2">
            {display!.primary_concerns.map((item, i) => (
              <ConditionCard key={i} item={item as ConditionInsight} />
            ))}
          </div>
        </div>
      )}

      {/* Lab highlights */}
      {(display?.lab_highlights?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-[500] uppercase tracking-widest text-white/25 px-1">Lab Highlights</span>
          <div className="columns-2 gap-2">
            {display!.lab_highlights.map((item, i) => (
              <div key={i} className="break-inside-avoid mb-2">
                <LabCard item={item as LabInsight} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regenerate */}
      {cached && !loading && (
        <button
          onClick={regenerate}
          className="self-end px-3 py-1 text-[10px] font-[300] text-white/30 border border-white/10 rounded-full hover:text-lime/60 hover:border-lime/20 transition-colors"
        >
          ↺ Re-brief
        </button>
      )}

      </div>
    </div>
  )
}
