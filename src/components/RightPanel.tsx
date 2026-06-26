'use client'
import { useState }       from 'react'
import { MetricCard }     from './MetricCard'
import { useTimeline }    from '@/context/TimelineContext'
import biomarkersData     from '@/data/biomarkers.json'
import conditionsData     from '@/data/conditions_real.json'
import visitsData         from '@/data/visits.json'

type Indicator = 'green' | 'red' | 'yellow'
type Trend     = '↗' | '↘' | '→'
type Severity  = 'stable' | 'watch' | 'critical'
type PanelMode = 'visit' | 'analyze'
type MainTab   = 'labs' | 'imaging' | 'conditions'

interface ImagingEntry { modality: string; region: string; src: string }
interface VisitRecord  { type: string; imaging: ImagingEntry[] }
interface VisitsMap    { [sessionId: string]: VisitRecord }

const SEVERITY_INDICATOR: Record<Severity, Indicator> = {
  stable: 'green', watch: 'yellow', critical: 'red',
}
const PIP_COLOR: Record<Indicator, string> = {
  green: 'bg-green-ok', yellow: 'bg-yellow-warn', red: 'bg-red-alert',
}
const SEVERITY_TEXT: Record<Indicator, string> = {
  green: 'text-green-ok', yellow: 'text-yellow-warn', red: 'text-red-alert',
}

export function RightPanel() {
  const { selectedSession } = useTimeline()

  const [mode, setMode]               = useState<PanelMode>('visit')
  const [activeTab, setActiveTab]     = useState<MainTab>('labs')
  const [activeLabCat, setActiveLabCat] = useState<string>('Hormone')

  const labCards = biomarkersData.biomarkers.Hormone.map((bm, i) => {
    const entry = bm.history.find(h => h.session === selectedSession)
      ?? bm.history[bm.history.length - 1]
    return {
      label:     bm.label,
      value:     entry.value,
      unit:      bm.unit,
      trend:     entry.trend     as Trend,
      indicator: entry.indicator as Indicator,
      delta:     'delta' in entry ? entry.delta as string : undefined,
      note:      'note'  in entry ? entry.note  as string : undefined,
      noChart:   bm.noChart,
      seed:      i + 1,
      rangeMin:  (bm as any).rangeMin  as number | undefined,
      normalMin: (bm as any).normalMin as number | undefined,
      normalMax: (bm as any).normalMax as number | undefined,
      rangeMax:  (bm as any).rangeMax  as number | undefined,
      mean:      (bm as any).mean      as number | undefined,
    }
  })

  const sessionConditions = conditionsData.conditions
    .map(c => {
      const h = c.history.find(h => h.session === selectedSession)
      if (!h) return null
      return {
        bone:        c.bone,
        displayName: c.displayName,
        severity:    h.severity as Severity,
        label:       h.label,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const visits     = visitsData.visits as VisitsMap
  const visitEntry = visits[selectedSession]

  const TAB_LABEL: Record<MainTab, string> = {
    labs: 'Labs', imaging: 'Imaging', conditions: 'Conditions',
  }

  return (
    <aside className="w-[clamp(380px,40vw,660px)] h-full px-4 pt-8 pb-4 flex flex-col gap-3 overflow-hidden">

      {mode === 'visit' ? (
        <>
          {/* Main tab bar + Analyze trigger */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              {(['labs', 'imaging', 'conditions'] as MainTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={activeTab === tab
                    ? 'px-3 py-1 text-[11px] font-[500] bg-lime text-black rounded-full'
                    : 'px-3 py-1 text-[11px] font-[300] text-white/40 glass-panel backdrop-blur-[40px] backdrop-saturate-150 rounded-full'
                  }
                >
                  {TAB_LABEL[tab]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMode('analyze')}
              className="px-3 py-1 text-[11px] font-[300] text-lime/70 border border-lime/20 rounded-full hover:text-lime hover:border-lime/40 transition-colors shrink-0"
            >
              Analyze →
            </button>
          </div>

          {/* Lab sub-category tabs — underline style */}
          {activeTab === 'labs' && (
            <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex items-center gap-5 px-4 border-b border-white/[0.06] shrink-0 rounded-xl">
              {biomarkersData.categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveLabCat(cat)}
                  className={`pb-2 text-[11px] font-[300] transition-colors border-b-2 -mb-px ${
                    activeLabCat === cat
                      ? 'text-white/80 border-lime'
                      : 'text-white/30 border-transparent hover:text-white/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Tab body */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">

            {activeTab === 'labs' && activeLabCat === 'Hormone' && (
              <div className="columns-3 gap-2.5">
                {labCards.map(card => (
                  <div key={card.label} className="break-inside-avoid mb-2.5">
                    <MetricCard {...card} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'labs' && activeLabCat !== 'Hormone' && (
              <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex items-center justify-center h-32">
                <p className="text-[11px] font-[300] text-white/25">No data for this category</p>
              </div>
            )}

            {activeTab === 'imaging' && (
              <div className="grid grid-cols-2 gap-2.5">
                {(visitEntry?.imaging ?? []).map(img => (
                  <div key={img.src} className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 text-[9px] font-[500] bg-white/10 text-white/60 rounded-full">{img.modality}</span>
                      <span className="text-[10px] font-[300] text-white/45 truncate">{img.region}</span>
                    </div>
                    <div className="h-28 rounded-xl overflow-hidden bg-black/40">
                      <img src={img.src} alt={img.region} className="w-full h-full object-cover object-center opacity-85" />
                    </div>
                  </div>
                ))}
                {!visitEntry?.imaging?.length && (
                  <div className="col-span-2 flex items-center justify-center h-32">
                    <p className="text-[11px] font-[300] text-white/25">No imaging for this visit</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'conditions' && (
              <div className="flex flex-col gap-2">
                {sessionConditions.length === 0 && (
                  <p className="text-[11px] font-[300] text-white/25 text-center py-8">No conditions recorded for this visit</p>
                )}
                {sessionConditions.map(cond => {
                  const indicator = SEVERITY_INDICATOR[cond.severity]
                  return (
                    <div key={cond.bone} className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex items-center gap-3 px-4 py-3">
                      <span className={`shrink-0 w-[2px] h-7 rounded-full ${PIP_COLOR[indicator]}`} />
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-[12px] font-[300] text-white/80 leading-none">{cond.displayName}</span>
                        <span className="text-[10px] font-[300] text-white/40 leading-none">{cond.label}</span>
                      </div>
                      <span className={`text-[9px] font-[400] uppercase tracking-wider shrink-0 ${SEVERITY_TEXT[indicator]}`}>
                        {cond.severity}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </>
      ) : (
        <>
          {/* Analyze mode header */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMode('visit')}
              className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white/80 transition-colors text-[14px]"
            >
              ←
            </button>
            <span className="text-[13px] font-[300] text-white/70">Timeline Analysis</span>
          </div>

          {/* Placeholder */}
          <div className="flex-1 glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex flex-col items-center justify-center gap-4">
            <p className="text-[11px] font-[300] text-white/30 text-center px-8 leading-relaxed">
              LLM synthesis across all visits will appear here in Phase 2.
            </p>
            <button className="px-5 py-2 bg-lime text-black text-[11px] font-[500] rounded-full opacity-40 cursor-not-allowed">
              Generate Report
            </button>
          </div>
        </>
      )}

    </aside>
  )
}
