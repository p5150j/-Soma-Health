export function TopNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-5">

      {/* Left — category pill */}
      <button className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex items-center gap-2 px-3 py-1.5 rounded-full">
        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-white/50" />
        </span>
        <span className="text-[11px] text-white/50">Category: Summary</span>
        <svg className="w-2.5 h-2.5 text-white/25" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Center — nav */}
      <nav className="flex items-center gap-0.5">
        <button className="p-2 text-white/35 hover:text-white/70 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="px-4 py-1.5 text-[12px] text-white/45 hover:text-white/75 transition-colors">Overview</button>
        <button className="px-4 py-1.5 text-[12px] font-medium bg-lime text-black rounded-full">Biometrics</button>
        <button className="px-3 py-1.5 text-[11px] text-white/35 flex items-center gap-1 hover:text-white/60 transition-colors">
          Department: Radiology - Lab 03
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="px-3 py-1.5 text-[11px] text-white/35 flex items-center gap-1 hover:text-white/60 transition-colors">
          Protocol: Full Body - Deep Scan
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="px-4 py-1.5 text-[12px] text-white/45 hover:text-white/75 transition-colors">Reports</button>
      </nav>

      {/* Right — icons */}
      <div className="flex items-center gap-4 text-white/35">
        <button className="hover:text-white/70 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>
        <button className="hover:text-white/70 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="7" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="relative hover:text-white/70 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M8 2a5 5 0 00-5 5v2l-1 2h12l-1-2V7a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-alert rounded-full" />
        </button>
      </div>

    </header>
  )
}
