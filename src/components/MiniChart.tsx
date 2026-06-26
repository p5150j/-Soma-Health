type Indicator = 'green' | 'red' | 'yellow'

const BAND_COLOR: Record<Indicator, string> = {
  red:    'rgba(90, 18, 18, 0.22)',
  yellow: 'rgba(85, 55, 8, 0.22)',
  green:  'rgba(12, 58, 22, 0.22)',
}

const MARKER_COLOR: Record<Indicator, string> = {
  red:    '#ff453a',
  yellow: '#f5a623',
  green:  '#32d74b',
}

const GRAD_GREEN  = 'rgba(62,255,192,0.25)'
const GRAD_YELLOW = 'rgba(245,166,35,0.2)'
const GRAD_RED    = 'rgba(255,69,58,0.2)'

function seededDots(seed: number, xMin: number, xMax: number): [number, number][] {
  let s = seed
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  return Array.from({ length: 6 }, () => [
    xMin + rand() * (xMax - xMin),
    40 + rand() * 32,
  ] as [number, number])
}

interface Props {
  indicator:  Indicator
  seed?:      number
  value?:     number
  rangeMin?:  number
  rangeMax?:  number
  normalMin?: number
  normalMax?: number
  mean?:      number
}

export function MiniChart({ indicator, seed = 1, value, rangeMin, rangeMax, normalMin, normalMax, mean }: Props) {
  const trackX1 = 4,  trackX2 = 96
  const lineY   = 32
  const bandTop = 36, bandBot = 74
  const ringX   = 90, ringY   = 74

  const hasData = value     !== undefined
               && rangeMin  !== undefined && rangeMax  !== undefined
               && normalMin !== undefined && normalMax !== undefined
               && mean      !== undefined

  const glowId = `glow-${indicator}-${seed}`
  const gradId = `zoneGrad-${seed}`

  const toX   = (v: number) => trackX1 + ((v - rangeMin!) / (rangeMax! - rangeMin!)) * (trackX2 - trackX1)
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

  const range       = hasData ? rangeMax! - rangeMin! : 1
  const isRightGood = hasData && normalMax! >= rangeMax! * 0.95
  const isUShape    = hasData && !isRightGood
                   && normalMin! > rangeMin! + range * 0.05
                   && normalMax! < rangeMax! - range * 0.05

  type GradStop = [string, string]
  let gradStops: GradStop[] = []

  if (hasData) {
    const p1  = ((toX(normalMin!) - trackX1) / (trackX2 - trackX1)) * 100
    const p2  = ((toX(normalMax!) - trackX1) / (trackX2 - trackX1)) * 100
    const p1y = Math.max(p1 - 8, 0).toFixed(1) + '%'
    const p2y = Math.min(p2 + 8, 100).toFixed(1) + '%'
    const p1s = p1.toFixed(1) + '%'
    const p2s = p2.toFixed(1) + '%'

    if (isRightGood) {
      gradStops = [[GRAD_RED, '0%'], [GRAD_YELLOW, p1y], [GRAD_GREEN, p1s], [GRAD_GREEN, '100%']]
    } else if (isUShape) {
      gradStops = [[GRAD_RED, '0%'], [GRAD_GREEN, p1s], [GRAD_GREEN, p2s], [GRAD_RED, '100%']]
    } else if (p1 < 0.5) {
      gradStops = [[GRAD_GREEN, '0%'], [GRAD_GREEN, p2s], [GRAD_YELLOW, p2y], [GRAD_RED, '100%']]
    } else {
      gradStops = [[GRAD_RED, '0%'], [GRAD_GREEN, p1s], [GRAD_GREEN, p2s], [GRAD_YELLOW, p2y], [GRAD_RED, '100%']]
    }
  }

  const patientX = hasData ? clamp(toX(value!),    trackX1 + 3, trackX2 - 3) : 0
  const meanX    = hasData ? clamp(toX(mean!),      trackX1,     trackX2)     : 0
  const normalX1 = hasData ? clamp(toX(normalMin!), trackX1,     trackX2 - 1) : trackX1
  const normalX2 = hasData ? clamp(toX(normalMax!), trackX1 + 1, trackX2)     : trackX2
  const dots     = seededDots(seed * 7919, normalX1, normalX2)

  return (
    <svg viewBox="0 0 100 88" width="100%" preserveAspectRatio="none" className="block overflow-visible">
      <defs>
        {hasData && (
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradStops.map(([color, offset], i) => (
              <stop key={i} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
        )}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Risk band */}
      <rect x={4} y={bandTop} width={92} height={bandBot - bandTop} rx={3} fill={BAND_COLOR[indicator]} />

      {/* Gradient zone track */}
      {hasData && (
        <rect x={4} y={30} width={92} height={4} rx={2} fill={`url(#${gradId})`} opacity={0.6} />
      )}

      {/* Reference line */}
      <line x1={4} y1={lineY} x2={96} y2={lineY} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />

      {/* Scatter dots constrained to normal zone */}
      {dots.map(([xp, yp], i) => (
        <circle key={i} cx={xp} cy={yp} r={1.6} fill="rgba(255,255,255,0.85)" />
      ))}

      {/* National mean tick */}
      {hasData && (
        <>
          <line x1={meanX} y1={26} x2={meanX} y2={38} stroke="rgba(255,255,255,0.4)" strokeWidth={0.8} />
          <circle cx={meanX} cy={lineY} r={1.5} fill="rgba(255,255,255,0.5)" />
        </>
      )}

      {/* Patient value marker with glow */}
      {hasData && (
        <circle cx={patientX} cy={lineY} r={3} fill={MARKER_COLOR[indicator]} filter={`url(#${glowId})`} />
      )}

      {/* Current reading ring + center dot */}
      <circle cx={ringX} cy={ringY} r={6.5} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.2} />
      <circle cx={ringX} cy={ringY} r={2.5} fill="white" />
    </svg>
  )
}
