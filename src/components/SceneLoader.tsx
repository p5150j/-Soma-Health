'use client'
import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

export function SceneLoader() {
  const { progress, active } = useProgress()
  const [visible, setVisible]   = useState(true)
  const [fading, setFading]     = useState(false)

  useEffect(() => {
    if (!active && progress >= 100) {
      setTimeout(() => setFading(true), 200)
      setTimeout(() => setVisible(false), 900)
    }
  }, [active, progress])

  if (!visible) return null

  return (
    <div className={`fixed inset-0 z-[200] bg-[#080808] flex flex-col items-center justify-center gap-6 transition-opacity duration-700 pointer-events-none ${fading ? 'opacity-0' : 'opacity-100'}`}>

      {/* Soma wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-[2px] h-[22px] bg-lime rounded-full" />
        <div className="flex flex-col gap-[3px]">
          <span className="text-[20px] font-[500] text-white tracking-tight leading-none">Soma</span>
          <span className="text-[11px] font-[300] text-white/40 leading-none tracking-wide">Your health, fully understood.</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-36 h-[1.5px] bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-lime rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

    </div>
  )
}
