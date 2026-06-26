// Pixel-perfect recreation of the scatter chart from the reference image:
// - horizontal reference line at ~38% height
// - dark colored risk band below the line, full width
// - 6 white scattered dots inside the band
// - colored dot sitting ON the reference line
// - ring + center dot at bottom-right = current reading

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

function seededDots(seed: number): [number, number][] {
  let s = seed
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  return Array.from({ length: 6 }, () => [8 + rand() * 84, 40 + rand() * 52] as [number, number])
}

interface Props {
  indicator: Indicator
  seed?: number
}

export function MiniChart({ indicator, seed = 1 }: Props) {
  const W = 100
  const H = 88

  const lineY   = H * 0.36
  const bandTop = H * 0.42
  const bandBot = H * 0.93
  const markerX = W * 0.18 + (seed % 5) * 12

  const ringX   = W * 0.90
  const ringY   = H * 0.80

  const dots = seededDots(seed * 7919)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="none"
      className="block overflow-visible"
    >
      {/* Risk band */}
      <rect
        x={2} y={bandTop}
        width={W - 4} height={bandBot - bandTop}
        rx={3}
        fill={BAND_COLOR[indicator]}
      />

      {/* Reference line */}
      <line
        x1={2} y1={lineY} x2={W - 2} y2={lineY}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.6}
      />

      {/* Scattered dots */}
      {dots.map(([xp, yp], i) => (
        <circle
          key={i}
          cx={xp}
          cy={yp}
          r={1.6}
          fill="rgba(255,255,255,0.85)"
        />
      ))}

      {/* Colored marker ON the line */}
      <circle
        cx={markerX} cy={lineY}
        r={2.8}
        fill={MARKER_COLOR[indicator]}
      />

      {/* Current value ring */}
      <circle
        cx={ringX} cy={ringY}
        r={6.5}
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={1.2}
      />
      <circle
        cx={ringX} cy={ringY}
        r={2.5}
        fill="white"
      />
    </svg>
  )
}
