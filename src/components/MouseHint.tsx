export function MouseHint() {
  return (
    <div className="fixed bottom-5 right-6 z-50">
      <div className="flex flex-col items-end gap-2">

        {/* Label */}
        <span className="text-[9px] font-[400] text-lime/50 tracking-widest uppercase">3D Scene Navigation</span>

        <div className="flex items-center gap-5 px-5 py-[13px] rounded-2xl bg-[rgba(18,18,20,0.55)] backdrop-blur-[40px] backdrop-saturate-150 border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">

          {/* Orbit */}
          <div className="flex items-center gap-2.5">
            <Mouse left />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-[300] text-white/40 tracking-wide leading-none">click + drag</span>
              <span className="text-[12px] font-[500] text-white/80 tracking-wide leading-none">Orbit</span>
            </div>
          </div>

          <span className="w-px h-4 bg-white/15" />

          {/* Pan */}
          <div className="flex items-center gap-2.5">
            <Mouse right />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-[300] text-white/40 tracking-wide leading-none">right drag</span>
              <span className="text-[12px] font-[500] text-white/80 tracking-wide leading-none">Pan</span>
            </div>
          </div>

          <span className="w-px h-4 bg-white/15" />

          {/* Zoom */}
          <div className="flex items-center gap-2.5">
            <ScrollWheel />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-[300] text-white/40 tracking-wide leading-none">scroll wheel</span>
              <span className="text-[12px] font-[500] text-white/80 tracking-wide leading-none">Zoom</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function Mouse({ left, right }: { left?: boolean; right?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <div className="flex gap-[2px]">
        <div className={`w-[11px] h-[13px] rounded-tl-[5px] rounded-bl-[2px] border ${left ? 'bg-lime/30 border-lime/50' : 'bg-white/10 border-white/30'}`} />
        <div className={`w-[11px] h-[13px] rounded-tr-[5px] rounded-br-[2px] border ${right ? 'bg-lime/30 border-lime/50' : 'bg-white/10 border-white/30'}`} />
      </div>
      <div className="w-[24px] h-[8px] rounded-b-[6px] border border-t-0 border-white/30 bg-white/10" />
    </div>
  )
}

function ScrollWheel() {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <div className="flex gap-[2px] relative">
        <div className="w-[11px] h-[13px] rounded-tl-[5px] rounded-bl-[2px] border border-white/30 bg-white/10" />
        <div className="absolute left-1/2 -translate-x-1/2 top-[3px] w-[3px] h-[7px] rounded-full bg-lime/60" />
        <div className="w-[11px] h-[13px] rounded-tr-[5px] rounded-br-[2px] border border-white/30 bg-white/10" />
      </div>
      <div className="w-[24px] h-[8px] rounded-b-[6px] border border-t-0 border-white/30 bg-white/10" />
    </div>
  )
}
