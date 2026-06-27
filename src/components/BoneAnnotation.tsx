'use client'
import React from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

export type Severity = 'watch' | 'critical'

interface Props {
  position:    THREE.Vector3
  displayName: string
  label:       string
  severity:    Severity
  portal:      React.RefObject<HTMLElement>
  occlude?:    'blending' | boolean
}

export function BoneAnnotation({ position, displayName, label, severity, portal, occlude = 'blending' }: Props) {
  const isWatch       = severity === 'watch'
  const severityLabel = isWatch ? 'Watch' : 'High Risk'

  return (
    <Html position={position} center occlude={occlude} zIndexRange={[9999, 0]} portal={portal}>
      <div className="pointer-events-none select-none w-[140px]">
        <div className="glass-panel backdrop-blur-[40px] backdrop-saturate-150 px-3 py-2.5 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-[400] text-white/90 leading-none truncate">{displayName}</span>
            <span className={`text-[9px] font-[500] leading-none shrink-0 ${isWatch ? 'text-yellow-warn' : 'text-red-alert'}`}>{severityLabel}</span>
          </div>
          <span className="text-[10px] font-[300] text-white/45 leading-none">{label}</span>
        </div>
      </div>
    </Html>
  )
}
