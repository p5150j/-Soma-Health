'use client'
import React, { useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import conditionsData from '@/data/conditions_real.json'
import { useTimeline } from '@/context/TimelineContext'

type Severity = 'watch' | 'critical'

interface ConditionEntry {
  bone:        string
  severity:    Severity
  label:       string
  displayName: string
}

const WIRE_COLOR:   Record<Severity, string> = { watch: '#f5c542', critical: '#ff453a' }
const FILL_OPACITY: Record<Severity, number> = { watch: 0.12,      critical: 0.18 }

function BoneAnnotation({ position, displayName, label, severity, portal }: {
  position:    THREE.Vector3
  displayName: string
  label:       string
  severity:    Severity
  portal:      React.RefObject<HTMLElement>
}) {
  const isWatch      = severity === 'watch'
  const severityLabel = isWatch ? 'Watch' : 'High Risk'

  return (
    <Html position={position} center occlude="blending" zIndexRange={[9999, 0]} portal={portal}>
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

function softSprite() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  grad.addColorStop(0,   'rgba(255,255,255,0.9)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.3)')
  grad.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

function Particles({ offsetY }: { offsetY: number }) {
  const { positions, sizes } = useMemo(() => {
    const count = 180
    const pos = new Float32Array(count * 3)
    const sz  = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const r     = 0.03 + Math.random() * 0.20
      const y     = (Math.random() - 0.5) * 1.4
      pos[i*3]   = r * Math.cos(theta)
      pos[i*3+1] = y
      pos[i*3+2] = r * Math.sin(theta) * 0.65
      sz[i]      = 0.008 + Math.random() * 0.022
    }
    return { positions: pos, sizes: sz }
  }, [])

  const texture = useMemo(() => softSprite(), [])

  return (
    <points position={[0, offsetY, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size"     args={[sizes,     1]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        transparent
        opacity={0.18}
        sizeAttenuation
        depthWrite={false}
        color="#ffffff"
        size={0.018}
      />
    </points>
  )
}

function Skeleton() {
  const { scene }          = useGLTF('/skeleton/skeleton_lo.glb')
  const { selectedSession } = useTimeline()

  const portalRef = useRef<HTMLElement>(null!)
  useEffect(() => {
    const el = document.getElementById('bone-annotation-portal')
    if (el) portalRef.current = el
  }, [])

  // Stable center — only recalculate when the scene object itself changes, never on session change.
  // Bounding box shifts if computed after fill meshes are added, which would jitter the model position.
  const offset = useMemo(() => {
    const box    = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box.getCenter(center)
    return center
  }, [scene])

  const annotations = useMemo(() => {
    const sessionLookup: Record<string, ConditionEntry> = {}
    conditionsData.conditions.forEach((c) => {
      const entry = c.history.find(h => h.session === selectedSession)
      if (entry) {
        sessionLookup[`${c.bone}_beige_0`] = {
          bone:        c.bone,
          severity:    entry.severity as Severity,
          label:       entry.label,
          displayName: c.displayName,
        }
      }
    })

    scene.updateMatrixWorld(true)

    const meshes: THREE.Mesh[] = []
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.userData?.isFill) meshes.push(child)
    })

    meshes.forEach((child) => {
      const fills = child.children.filter(c => (c as THREE.Object3D & { userData: { isFill?: boolean } }).userData?.isFill)
      fills.forEach(f => child.remove(f))
    })

    const sceneWorldPos = new THREE.Vector3()
    scene.getWorldPosition(sceneWorldPos)

    const anns: { position: THREE.Vector3; condition: ConditionEntry }[] = []

    meshes.forEach((child) => {
      const condition = sessionLookup[child.name]

      child.material = new THREE.MeshBasicMaterial({
        color:       condition ? WIRE_COLOR[condition.severity] : '#c8dff0',
        wireframe:   true,
        transparent: true,
        opacity:     condition ? 0.85 : 0.18,
      })

      if (condition) {
        const solid = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({
            color:       WIRE_COLOR[condition.severity],
            transparent: true,
            opacity:     FILL_OPACITY[condition.severity],
            side:        THREE.DoubleSide,
            depthWrite:  false,
          })
        )
        solid.userData = { isFill: true }
        child.add(solid)

        const pos = new THREE.Vector3()
        child.getWorldPosition(pos)
        pos.sub(sceneWorldPos)
        anns.push({ position: pos, condition })
      }
    })

    return anns
  }, [scene, selectedSession])

  return (
    <group position={[-offset.x, -offset.y, -offset.z]}>
      <primitive object={scene} />
      <ambientLight intensity={0.6} />
      {annotations.map(({ position, condition }) => (
        <BoneAnnotation
          key={condition.bone}
          position={position}
          displayName={condition.displayName}
          label={condition.label}
          severity={condition.severity}
          portal={portalRef}
        />
      ))}
    </group>
  )
}


export default function BodyViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0.67, 0.55], fov: 52 }}
      gl={{ alpha: true, antialias: true }}
      className="w-full h-full"
    >
      <Skeleton />
      <Particles offsetY={0.67} />
      <OrbitControls
        target={[0, 0.67, 0]}
        enablePan={true}
        minDistance={0.3}
        maxDistance={4.0}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </Canvas>
  )
}

useGLTF.preload('/skeleton/skeleton_lo.glb')
