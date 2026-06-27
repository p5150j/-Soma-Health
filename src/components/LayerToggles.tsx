'use client'
import { useTimeline, LayerMode } from '@/context/TimelineContext'

function SliderToggle({ label, on, onClick, disabled }: {
  label:     string
  on:        boolean
  onClick?:  () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 disabled:cursor-not-allowed"
    >
      <span className={`text-[11px] font-[400] tracking-wide transition-colors ${
        disabled ? 'text-white/20' : on ? 'text-white/80' : 'text-white/35'
      }`}>{label}</span>

      {/* Track */}
      <span className={`relative flex items-center w-[34px] h-[18px] rounded-full transition-colors duration-200 ${
        disabled ? 'bg-white/8' : on ? 'bg-lime' : 'bg-white/15'
      }`}>
        {/* Thumb */}
        <span className={`absolute left-[3px] w-[12px] h-[12px] rounded-full shadow-sm transition-transform duration-200 ${
          disabled ? 'bg-white/20' : 'bg-white'
        } ${on && !disabled ? 'translate-x-[16px]' : 'translate-x-0'}`} />
      </span>
    </button>
  )
}

function next(bones: boolean, organs: boolean): LayerMode {
  if (bones && organs) return 'all'
  if (bones)           return 'bones'
  if (organs)          return 'organs'
  return 'none'
}

export function LayerToggles() {
  const { activeLayer, setActiveLayer } = useTimeline()
  const bonesOn  = activeLayer === 'bones'  || activeLayer === 'all'
  const organsOn = activeLayer === 'organs' || activeLayer === 'all'

  return (
    <div className="fixed bottom-5 left-6 z-50">
      <div className="flex items-center gap-4 px-5 py-[14px] rounded-2xl bg-[rgba(18,18,20,0.55)] backdrop-blur-[40px] backdrop-saturate-150 border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">

        <SliderToggle
          label="Bones"
          on={bonesOn}
          onClick={() => setActiveLayer(next(!bonesOn, organsOn))}
        />

        <span className="w-px h-3.5 bg-white/10" />

        <SliderToggle
          label="Organs"
          on={organsOn}
          onClick={() => setActiveLayer(next(bonesOn, !organsOn))}
        />

        <span className="w-px h-3.5 bg-white/10" />

        <SliderToggle label="Labs" on={false} disabled />

      </div>
    </div>
  )
}
