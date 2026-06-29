'use client'
import { useState }           from 'react'
import { MetricCard }         from './MetricCard'
import { useTimeline }        from '@/context/TimelineContext'
import { AnalyzePanel }       from './AnalyzePanel'
import { ScanModal }          from './ScanModal'
import biomarkersData         from '@/data/biomarkers.json'
import conditionsData         from '@/data/conditions_real.json'
import organConditionsData    from '@/data/conditions_organs.json'
import visitsData             from '@/data/visits.json'

type Indicator = 'green' | 'red' | 'yellow'
type Trend     = '↗' | '↘' | '→'
type Severity  = 'stable' | 'watch' | 'critical'
type PanelMode = 'visit' | 'analyze'
type MainTab   = 'labs' | 'imaging' | 'conditions'

interface ImagingEntry { modality: string; region: string; src: string; enhanced?: string; bone?: string; heatmap?: string }
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
  const [modalImage, setModalImage]   = useState<ImagingEntry | null>(null)

  const categoryMarkers = (biomarkersData.biomarkers as Record<string, typeof biomarkersData.biomarkers.Hormone>)[activeLabCat] ?? []

  const labCards = categoryMarkers.map((bm, i) => {
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
      const h    = c.history.find(h => h.session === selectedSession)
      if (!h) return null
      const prev = c.history.filter(h => h.session !== selectedSession).at(-1)
      const trend: 'worsening' | 'stable' | 'new' =
        !prev ? 'new'
        : (h.severity === 'critical' && prev.severity === 'watch') ? 'worsening'
        : 'stable'
      return {
        key:         c.bone,
        displayName: c.displayName,
        icd10:       (c as any).icd10 as string | undefined,
        description: (c as any).description as string | undefined,
        severity:    h.severity as Severity,
        label:       h.label,
        trend,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const sessionOrgans = organConditionsData.conditions
    .map(c => {
      const h = c.history.find(h => h.session === selectedSession)
      if (!h) return null
      return {
        key:         c.organ,
        displayName: c.displayName,
        icd10:       (c as any).icd10 as string | undefined,
        description: (c as any).description as string | undefined,
        severity:    h.severity as Severity,
        label:       h.label,
        trend:       'new' as const,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const visits     = visitsData.visits as VisitsMap
  const visitEntry = visits[selectedSession]

  const TAB_LABEL: Record<MainTab, string> = {
    labs: 'Labs', imaging: 'Imaging', conditions: 'Conditions',
  }

  return (
    <aside className="w-[clamp(340px,38vw,560px)] h-full px-4 pt-[42px] pb-4 flex flex-col gap-3 overflow-hidden">

      {mode === 'visit' ? (
        <>
          {/* Main tab bar + Deep Brief CTA */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              {(['labs', 'imaging', 'conditions'] as MainTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={activeTab === tab
                    ? 'px-4 py-1.5 text-[11px] font-[500] bg-lime text-black rounded-full'
                    : 'px-4 py-1.5 text-[11px] font-[300] text-white/40 glass-panel backdrop-blur-[40px] backdrop-saturate-150 rounded-full'
                  }
                >
                  {TAB_LABEL[tab]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMode('analyze')}
              className="px-4 py-1.5 text-[11px] font-[500] bg-lime text-black rounded-full hover:bg-lime/90 active:scale-[0.98] transition-all shrink-0"
            >
              Holistic Deep Brief →
            </button>
          </div>

          {/* Lab sub-category tabs — underline style */}
          {activeTab === 'labs' && (
            <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex items-center gap-5 px-4 border-b border-white/[0.06] shrink-0 rounded-xl">
              {biomarkersData.categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveLabCat(cat)}
                  className={`pt-2 pb-2 text-[11px] font-[300] transition-colors border-b-2 -mb-px ${
                    activeLabCat === cat
                      ? 'text-white/80 border-lime'
                      : 'text-white/55 border-transparent hover:text-white/75'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Tab body */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">

            {activeTab === 'labs' && labCards.length > 0 && (
              <div className="columns-3 gap-2.5">
                {labCards.map(card => (
                  <div key={card.label} className="break-inside-avoid mb-2.5">
                    <MetricCard {...card} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'labs' && labCards.length === 0 && (
              <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex items-center justify-center h-32">
                <p className="text-[11px] font-[300] text-white/25">No data for this category</p>
              </div>
            )}

            {activeTab === 'imaging' && (
              <div className="grid grid-cols-2 gap-2.5">
                {(visitEntry?.imaging ?? []).map((img) => (
                  <div
                    key={img.src}
                    className="relative group glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-3 flex flex-col gap-2 cursor-pointer"
                    onClick={() => setModalImage(img as ImagingEntry)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 text-[9px] font-[500] bg-white/10 text-white/60 rounded-full">{img.modality}</span>
                      <span className="text-[10px] font-[300] text-white/45 truncate">{img.region}</span>
                    </div>
                    <div className="relative h-36 rounded-xl overflow-hidden bg-black/40">
                      <img src={img.src} alt={img.region} className="w-full h-full object-cover object-center opacity-85" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-[300] text-white/80 tracking-wide">View Enhanced →</span>
                      </div>
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

            {modalImage && (
              <ScanModal
                image={modalImage}
                onClose={() => setModalImage(null)}
              />
            )}

            {activeTab === 'conditions' && (
              <div className="flex flex-col gap-4">
                {sessionConditions.length === 0 && sessionOrgans.length === 0 && (
                  <p className="text-[11px] font-[300] text-white/25 text-center py-8">No conditions recorded for this visit</p>
                )}

                {sessionConditions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-[500] uppercase tracking-widest text-white/25 px-1">Skeletal</span>
                    <div className="columns-2 gap-2">
                    {sessionConditions.map(item => {
                      const indicator = SEVERITY_INDICATOR[item.severity]
                      const severityLabel = item.severity === 'critical' ? 'High Risk' : item.severity === 'watch' ? 'Watch' : 'Stable'
                      return (
                        <div key={item.key} className="break-inside-avoid mb-2 glass-panel backdrop-blur-[40px] backdrop-saturate-150 overflow-hidden">
                          <div className={`h-[1.5px] w-full ${PIP_COLOR[indicator]}`} />
                          <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-[13px] font-[400] text-white/90 leading-tight tracking-tight">{item.displayName}</span>
                              <div className="flex flex-col items-end gap-0.5 shrink-0 pt-px">
                                <span className={`text-[11px] font-[500] ${SEVERITY_TEXT[indicator]}`}>{severityLabel}</span>
                                {item.trend === 'worsening' && <span className="text-[9px] text-red-alert/60 tracking-wide">↑ worsening</span>}
                                {item.trend === 'new'       && <span className="text-[9px] text-white/20 tracking-wide">new</span>}
                              </div>
                            </div>
                            <span className="text-[11px] font-[300] text-white/50 leading-snug">{item.label}</span>
                            {item.description && (
                              <p className="text-[10px] font-[300] text-white/25 leading-relaxed">{item.description}</p>
                            )}
                            {item.icd10 && (
                              <span className="text-[9px] font-[300] text-white/15 tracking-widest">ICD-10 · {item.icd10}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    </div>
                  </div>
                )}

                {sessionOrgans.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-[500] uppercase tracking-widest text-white/25 px-1">Organs</span>
                    <div className="columns-2 gap-2">
                    {sessionOrgans.map(item => {
                      const indicator = SEVERITY_INDICATOR[item.severity]
                      const severityLabel = item.severity === 'critical' ? 'High Risk' : item.severity === 'watch' ? 'Watch' : 'Stable'
                      return (
                        <div key={item.key} className="break-inside-avoid mb-2 glass-panel backdrop-blur-[40px] backdrop-saturate-150 overflow-hidden">
                          <div className={`h-[1.5px] w-full ${PIP_COLOR[indicator]}`} />
                          <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-[13px] font-[400] text-white/90 leading-tight tracking-tight">{item.displayName}</span>
                              <span className={`text-[11px] font-[500] shrink-0 pt-px ${SEVERITY_TEXT[indicator]}`}>{severityLabel}</span>
                            </div>
                            <span className="text-[11px] font-[300] text-white/50 leading-snug">{item.label}</span>
                            {item.description && (
                              <p className="text-[10px] font-[300] text-white/25 leading-relaxed">{item.description}</p>
                            )}
                            {item.icd10 && (
                              <span className="text-[9px] font-[300] text-white/15 tracking-widest">ICD-10 · {item.icd10}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    </div>
                  </div>
                )}
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
            <span className="text-[13px] font-[300] text-white/70">Deep Brief</span>
          </div>

          <AnalyzePanel />
        </>
      )}

    </aside>
  )
}
