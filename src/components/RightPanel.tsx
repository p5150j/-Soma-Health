'use client'
import { MetricCard }   from './MetricCard'
import { useTimeline }  from '@/context/TimelineContext'
import biomarkersData   from '@/data/biomarkers.json'

const TABS = biomarkersData.categories

type Indicator = 'green' | 'red' | 'yellow'
type Trend     = '↗' | '↘' | '→'

export function RightPanel() {
  const { selectedSession } = useTimeline()

  const cards = biomarkersData.biomarkers.Hormone.map((bm, i) => {
    const entry = bm.history.find(h => h.session === selectedSession)
      ?? bm.history[bm.history.length - 1]
    return {
      label:     bm.label,
      value:     entry.value,
      unit:      bm.unit,
      trend:     entry.trend     as Trend,
      indicator: entry.indicator as Indicator,
      delta:     'delta' in entry ? entry.delta : undefined,
      note:      'note'  in entry ? entry.note  : undefined,
      noChart:   bm.noChart,
      seed:      i + 1,
    }
  })

  return (
    <aside className="w-[clamp(380px,40vw,660px)] h-full p-4 flex flex-col gap-3 overflow-y-auto no-scrollbar">

      {/* Category tabs */}
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        <button className="w-7 h-7 glass-panel flex items-center justify-center rounded-full">
          <svg className="w-3 h-3 text-white/50" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={tab === 'Hormone'
              ? 'px-3 py-1 text-[11px] font-[500] bg-lime text-black rounded-full'
              : 'px-3 py-1 text-[11px] font-[300] text-white/40 glass-panel rounded-full'
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3-col masonry fills remaining height */}
      <div className="columns-3 gap-2.5 flex-1 min-h-0 h-full">
        {cards.map((card) => (
          <div key={card.label} className="break-inside-avoid mb-2.5">
            <MetricCard
              label={card.label}
              value={card.value}
              unit={card.unit}
              trend={card.trend}
              indicator={card.indicator}
              delta={card.delta}
              note={card.note}
              noChart={card.noChart}
              seed={card.seed}
            />
          </div>
        ))}
      </div>

    </aside>
  )
}
