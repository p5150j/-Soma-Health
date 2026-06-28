'use client'
import { useState, useCallback } from 'react'
import type { HealthAnalysis, ConditionInsight, LabInsight } from 'baml_client/types'
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

    </div>
  )
}

function LabCard({ item }: { item: LabInsight }) {
  return (
    <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 px-3 pt-2.5 pb-3 flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-[400] text-white/80 leading-none">{item.marker}</span>
        <span className="text-[11px] font-[500] text-lime shrink-0">{item.value}<span className="text-[9px] font-[300] text-white/30 ml-0.5">{item.unit}</span></span>
      </div>
      <p className="text-[10px] font-[300] text-white/30 leading-relaxed">{item.interpretation}</p>
    </div>
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
      <div className="flex-1 glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex flex-col items-center justify-center gap-4 min-h-0">
        <p className="text-[11px] font-[300] text-white/30 text-center px-8 leading-relaxed">
          Full timeline synthesis across all visits — conditions, labs, trajectory.
        </p>
        <button
          onClick={run}
          className="px-5 py-2 bg-lime text-black text-[11px] font-[500] rounded-full hover:opacity-90 transition-opacity"
        >
          Generate Report
        </button>
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
          <p className="text-[10px] font-[300] text-white/35 tracking-wide">Analyzing…</p>
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

      {/* Watchlist + Recommendations */}
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

      {/* Regenerate */}
      {cached && !loading && (
        <button
          onClick={regenerate}
          className="self-end px-3 py-1 text-[10px] font-[300] text-white/30 border border-white/10 rounded-full hover:text-lime/60 hover:border-lime/20 transition-colors"
        >
          ↺ Regenerate
        </button>
      )}

      </div>
    </div>
  )
}
