'use client'
import { useState, useEffect } from 'react'
import { MiniChart } from './MiniChart'

function decimalsOf(str: string): number {
  const dot = str.indexOf('.')
  return dot === -1 ? 0 : str.length - dot - 1
}

function AnimatedValue({ value, seed }: { value: string; seed: number }) {
  const target   = parseFloat(value)
  const decimals = decimalsOf(value)
  const duration = 900 + seed * 190
  const [cur, setCur] = useState(0)

  useEffect(() => {
    setCur(0)
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t      = Math.min((now - start) / duration, 1)
      const eased  = 1 - (1 - t) ** 3
      const next   = parseFloat((eased * target).toFixed(decimals))
      setCur(next)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setCur(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, target, duration, decimals])

  return <>{cur.toFixed(decimals)}</>
}

type Indicator = 'green' | 'red' | 'yellow'

const PIP_COLOR: Record<Indicator, string> = {
  green:  'bg-green-ok',
  yellow: 'bg-yellow-warn',
  red:    'bg-red-alert',
}

const DELTA_COLOR: Record<Indicator, string> = {
  green:  'text-green-ok',
  yellow: 'text-yellow-warn',
  red:    'text-red-alert',
}

interface Props {
  label:     string
  value:     string
  unit:      string
  trend:     '↗' | '↘' | '→'
  indicator: Indicator
  delta?:    string
  note?:     string
  noChart?:  boolean
  seed?:     number
  rangeMin?:  number
  normalMin?: number
  normalMax?: number
  rangeMax?:  number
  mean?:      number
}

export function MetricCard({ label, value, unit, trend, indicator, delta, note, noChart, seed = 1, rangeMin, normalMin, normalMax, rangeMax, mean }: Props) {
  return (
    <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 flex flex-col p-3.5 w-full">
      {/* Pip + label */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className={`shrink-0 w-[2px] h-[11px] rounded-full ${PIP_COLOR[indicator]}`} />
        <span className="text-[11px] font-[300] text-white/50 leading-none truncate">{label}</span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span className="text-[32px] leading-[1] font-[200] tracking-[-0.03em] text-white"><AnimatedValue value={value} seed={seed} /></span>
        <span className="text-[10px] font-[300] text-white/45 leading-none ml-0.5">{unit}</span>
        <span className={`text-[14px] ml-1 leading-none ${trend === '↗' ? 'text-green-ok' : trend === '↘' ? 'text-red-alert' : 'text-white/50'}`}>{trend}</span>
      </div>

      {/* Delta */}
      {delta && <p className={`text-[10px] font-[400] mt-1.5 ${DELTA_COLOR[indicator]}`}>{delta}</p>}

      {/* Note */}
      {note && <p className="text-[10px] font-[300] text-white/40 mt-1.5 leading-snug">{note}</p>}

      {/* Chart */}
      {!noChart && (
        <div className="mt-3">
          <MiniChart
            indicator={indicator}
            seed={seed}
            value={parseFloat(value)}
            rangeMin={rangeMin}
            normalMin={normalMin}
            normalMax={normalMax}
            rangeMax={rangeMax}
            mean={mean}
          />
        </div>
      )}
    </div>
  )
}
