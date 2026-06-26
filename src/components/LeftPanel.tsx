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
        <h1 className="text-[28px] font-[300] text-white tracking-tight leading-none">Leo Vance</h1>
        <p className="text-[10px] font-[300] text-white/30 mt-1.5 tracking-widest uppercase">ID: SV-7294</p>
      </div>

      {/* Record dropdown */}
      <button className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex items-center justify-between px-4 py-2.5 rounded-xl w-full">
        <span className="text-[11px] font-[300] text-white/45">Record: Family History</span>
        <svg className="w-2.5 h-2.5 text-white/20" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Patient Profile */}
      <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 w-[2px] h-[11px] rounded-full bg-white/25" />
            <span className="text-[11px] font-[300] text-white/50">Patient Profile</span>
          </div>
          <svg className="w-3 h-3 text-white/20" viewBox="0 0 10 6" fill="none">
            <path d="M9 5L5 1 1 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Demographics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Age',       value: '01/25/1962', sub: '(61)' },
            { label: 'Gender',    value: 'Female',     sub: null   },
            { label: 'Ethnicity', value: 'Other',      sub: null   },
          ].map(({ label, value, sub }) => (
            <div key={label}>
              <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-[10px] font-[300] text-white/65 leading-tight">
                {value}{sub && <><br/><span className="text-white/35">{sub}</span></>}
              </p>
            </div>
          ))}
        </div>

        {/* Weight */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] font-[300] text-white/25 uppercase tracking-wider">Weight and Trend</p>
            <p className="text-[12px] font-[200] text-white/80">63.6 <span className="text-[9px] font-[300] text-white/35">kg</span></p>
          </div>
          <div className="h-[2px] bg-white/8 rounded-full overflow-hidden">
            <div className="h-full w-[62%] bg-white/30 rounded-full" />
          </div>
        </div>

        {/* Biological Age */}
        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="shrink-0 w-[2px] h-[11px] rounded-full bg-yellow-warn" />
            <span className="text-[11px] font-[300] text-white/50">Biological Age</span>
          </div>
          {/* Big value row */}
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-[200] text-white tracking-[-0.03em] leading-none">31.2</span>
            <span className="w-[5px] h-[5px] rounded-full bg-red-alert mb-1 shrink-0" />
          </div>
          {/* Secondary value with progress */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-[300] text-white/45 shrink-0">19.2</span>
            <div className="flex-1 h-[2px] bg-white/8 rounded-full overflow-hidden">
              <div className="h-full w-[55%] bg-lime rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Scan thumbnails */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Tomography',  date: 'Jan 12, 2022', imageNum: 8  },
          { label: 'Radiography', date: 'Feb 14, 2022', imageNum: 14 },
        ].map(({ label, date, imageNum }) => (
          <div key={label} className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-[300] text-white/55">{label}</p>
              <svg className="w-3 h-3 text-white/20" viewBox="0 0 12 12" fill="none">
                <path d="M2 10L10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[9px] font-[300] text-white/25 mb-2">{date}</p>
            {/* Scan placeholder */}
            <div className="h-20 rounded-lg overflow-hidden relative">
              <svg viewBox="0 0 100 60" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
                <defs>
                  <radialGradient id={`scan-${label}`} cx="50%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="rgba(180,210,230,0.18)" />
                    <stop offset="60%" stopColor="rgba(80,110,140,0.08)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                  </radialGradient>
                </defs>
                <rect width="100" height="60" fill="rgba(255,255,255,0.03)" />
                <rect width="100" height="60" fill={`url(#scan-${label})`} />
                {/* Bone-like vertical structure */}
                <rect x="44" y="4" width="12" height="52" rx="6" fill="rgba(200,220,240,0.12)" />
                <rect x="47" y="8" width="6" height="44" rx="3" fill="rgba(220,235,250,0.18)" />
                {/* Rib-like horizontal bands */}
                {[10,17,24,31,38,45].map((y, i) => (
                  <ellipse key={i} cx="50" cy={y} rx={22 - i * 1.5} ry="2.5" fill="none" stroke="rgba(180,210,230,0.12)" strokeWidth="1.5" />
                ))}
                {/* Scan line */}
                <line x1="0" y1="28" x2="100" y2="28" stroke="rgba(62,255,192,0.08)" strokeWidth="0.5" />
              </svg>
            </div>
            <p className="text-[9px] font-[300] text-white/20 mt-1.5">Image: {imageNum}</p>
          </div>
        ))}
      </div>

      {/* Person icon + Doctor pill — floats at bottom of panel */}
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
