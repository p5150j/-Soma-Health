'use client'
import { useTimeline } from '@/context/TimelineContext'
import conditionsData  from '@/data/conditions_real.json'

function Dots({ total, active }: { total: number; active: number | null }) {
  return (
    <div className="flex items-center gap-[6px]">
      {Array.from({ length: total }).map((_, i) =>
        i === active ? (
          <span key={i} className="relative flex items-center justify-center w-[13px] h-[13px] shrink-0">
            <span className="absolute inset-0 rounded-full border border-white/40" />
            <span className="w-[4px] h-[4px] rounded-full bg-white" />
          </span>
        ) : (
          <span key={i} className="w-[4px] h-[4px] rounded-full bg-white/25 shrink-0" />
        )
      )}
    </div>
  )
}

const SESSION_ICONS = [
  <svg key="heart" className="w-[14px] h-[14px] text-white/35 shrink-0" viewBox="0 0 12 12" fill="none">
    <path d="M6 10.5S1 7 1 4a2.5 2.5 0 015 0 2.5 2.5 0 015 0c0 3-5 6.5-5 6.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
  </svg>,
  <svg key="star" className="w-[14px] h-[14px] text-white/35 shrink-0" viewBox="0 0 12 12" fill="none">
    <path d="M6 1l1.12 3.45H10.8L7.84 6.6l1.12 3.45L6 8.1l-2.96 1.95L4.16 6.6 1.2 4.45H4.88z" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round"/>
  </svg>,
  <svg key="grid" className="w-[14px] h-[14px] text-white/35 shrink-0" viewBox="0 0 12 12" fill="none">
    <rect x="1" y="1" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1"/>
    <rect x="7" y="1" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1"/>
    <rect x="1" y="7" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1"/>
    <rect x="7" y="7" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1"/>
  </svg>,
]

function conditionCountForSession(sessionId: string): number {
  return conditionsData.conditions.filter(c =>
    c.history.some(h => h.session === sessionId)
  ).length
}

export function FooterNav() {
  const { sessions, selectedSession, setSelectedSession } = useTimeline()
  const currentIdx = sessions.findIndex(s => s.id === selectedSession)

  function stepBy(dir: 1 | -1) {
    const next = currentIdx + dir
    if (next >= 0 && next < sessions.length) setSelectedSession(sessions[next].id)
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-8 px-8 py-5 rounded-2xl bg-[rgba(18,18,20,0.55)] backdrop-blur-[40px] backdrop-saturate-150 border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">

        {/* Left step controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => stepBy(-1)}
            disabled={currentIdx === 0}
            className="bg-[rgba(50,50,56,0.9)] border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] rounded-[11px] w-9 h-9 flex items-center justify-center text-[16px] font-[200] text-white/55 disabled:opacity-30 transition-opacity"
          >+</button>
          <button
            onClick={() => stepBy(1)}
            disabled={currentIdx === sessions.length - 1}
            className="bg-[rgba(50,50,56,0.9)] border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] rounded-[11px] w-9 h-9 flex items-center justify-center text-[16px] font-[200] text-white/55 disabled:opacity-30 transition-opacity"
          >−</button>
        </div>

        <span className="w-px h-5 bg-white/10 shrink-0" />

        {/* Timeline sessions */}
        <div className="flex items-center gap-6">
          {sessions.map((s, i) => {
            const isActive   = s.id === selectedSession
            const dotCount   = conditionCountForSession(s.id)

            return (
              <div key={s.id} className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedSession(s.id)}
                  className="flex items-center gap-4 transition-opacity"
                >
                  <div className="flex flex-col leading-none gap-[2px]">
                    <span className={`text-[9px] font-[300] transition-colors ${isActive ? 'text-white/60' : 'text-white/25'}`}>{s.year}</span>
                    <span className={`text-[12px] font-[300] transition-colors ${isActive ? 'text-white' : 'text-white/60'}`}>{s.label}</span>
                  </div>

                  {SESSION_ICONS[i]}

                  <Dots total={5} active={isActive ? Math.min(dotCount, 4) : null} />

                  {s.status && (
                    <span className={`text-[10px] font-[300] transition-colors ${isActive ? 'text-white/55' : 'text-white/35'}`}>{s.status}</span>
                  )}
                </button>

                {i < sessions.length - 1 && (
                  <div className="flex items-center gap-2 shrink-0 ml-1">
                    <span className="w-px h-4 bg-white/12" />
                    <div className="flex flex-col items-center gap-[2px]">
                      <span className="w-px h-[6px] bg-white/25" />
                      <span className="w-[4px] h-[4px] rounded-full bg-white/35" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
