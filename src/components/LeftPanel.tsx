export function LeftPanel() {
  return (
    <aside className="w-[clamp(280px,28vw,420px)] h-full p-4 flex flex-col gap-3 overflow-y-auto no-scrollbar">

      {/* Patient name */}
      <div className="pt-1 pb-1">
        <button className="text-white/25 mb-3">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-[28px] font-[300] text-white tracking-tight leading-none">Patrick Ortell</h1>
        <p className="text-[10px] font-[300] text-white/30 mt-1.5 tracking-widest uppercase">ID: SV-7294</p>
      </div>

      {/* Profile card */}
      <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 w-[2px] h-[11px] rounded-full bg-white/25" />
          <span className="text-[11px] font-[300] text-white/50">Patient Profile</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'DOB',       value: '01/25/1977', sub: '(49)' },
            { label: 'Gender',    value: 'Male',       sub: null   },
            { label: 'Ethnicity', value: 'White',      sub: null   },
          ].map(({ label, value, sub }) => (
            <div key={label}>
              <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-[10px] font-[300] text-white/65 leading-tight">
                {value}{sub && <><br/><span className="text-white/35">{sub}</span></>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Vitals card */}
      <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 w-[2px] h-[11px] rounded-full bg-white/25" />
          <span className="text-[11px] font-[300] text-white/50">Vitals</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <div>
            <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider mb-1">Height</p>
            <p className="text-[20px] font-[200] text-white/80 leading-none">5'7"</p>
          </div>
          <div>
            <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider mb-1">Weight</p>
            <p className="text-[20px] font-[200] text-white/80 leading-none">230 <span className="text-[9px] font-[300] text-white/35">lbs</span></p>
          </div>
          <div>
            <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider mb-1">Temp</p>
            <p className="text-[20px] font-[200] text-white/80 leading-none">98.4 <span className="text-[9px] font-[300] text-white/35">°F</span></p>
          </div>
          <div>
            <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider mb-1">O₂ Sat</p>
            <p className="text-[20px] font-[200] text-white/80 leading-none">96 <span className="text-[9px] font-[300] text-white/35">%</span></p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 w-[2px] h-[11px] rounded-full bg-red-alert" />
            <span className="text-[11px] font-[300] text-white/50">BMI</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-[200] text-white/80 leading-none">36.0</span>
            <span className="text-[9px] font-[300] text-red-alert">Class II Obesity</span>
          </div>
        </div>
      </div>

      {/* Biological Age */}
      <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 w-[2px] h-[11px] rounded-full bg-white/20" />
            <span className="text-[11px] font-[300] text-white/50">Biological Age</span>
          </div>
          <span className="text-[9px] font-[300] text-white/25 italic">Phase 5 — AI derived</span>
        </div>
        <span className="text-[32px] font-[200] text-white/20 tracking-[-0.03em] leading-none">—</span>
      </div>

      {/* Visit History — 3 mini cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-3 flex flex-col gap-1.5">
          <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider">Last Seen</p>
          <p className="text-[11px] font-[300] text-white/65 leading-tight">Feb 2026</p>
        </div>
        <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-3 flex flex-col gap-1.5">
          <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider">Visits</p>
          <p className="text-[11px] font-[300] text-white/65 leading-tight">2 <span className="text-white/30 text-[9px]">/ 9yr</span></p>
        </div>
        <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-3 flex flex-col gap-1.5">
          <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider">Pattern</p>
          <p className="text-[11px] font-[300] text-yellow-warn leading-tight">Reactive</p>
        </div>
      </div>

      {/* Doctor pill */}
      <div className="mt-auto flex items-center gap-2.5 pt-1">
        <button className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white/40" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M2.5 13.5C2.5 11 5 9 8 9s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="flex-1 flex items-center justify-between bg-lime/15 border border-lime/25 text-lime text-[11px] font-[300] px-3.5 py-2 rounded-full">
          Doctor: Julian Hayes
          <svg className="w-2.5 h-2.5 ml-1" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

    </aside>
  )
}
