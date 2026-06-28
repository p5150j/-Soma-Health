'use client'
import React, { Suspense, useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Line } from '@react-three/drei'
import { BoneAnnotation, Severity } from './BoneAnnotation'
import { useTimeline } from '@/context/TimelineContext'
import organConditionsData from '@/data/conditions_organs.json'

const WIRE_COLOR:   Record<Severity, string> = { watch: '#f5c542', critical: '#ff453a' }
const WIRE_OPACITY: Record<Severity, number> = { watch: 0.70,      critical: 0.85 }
const FILL_OPACITY: Record<Severity, number> = { watch: 0.18,      critical: 0.26 }
const HEALTHY_COLOR    = '#c8dff0'
const HEALTHY_WIRE     = 0.28
const LAB_CYAN         = '#4fc3f7'
const LAB_FILL_OPACITY = 0.28

interface OrganDef {
  key:              string
  anchor:           string
  offset:           [number, number, number]
  scale:            [number, number, number]
  shape:            'sphere' | 'cylinder'
  annotationOffset: [number, number, number]
  modelUrl?:        string
  modelScale?:      number
  flipX?:           boolean
  rotateY?:         number
  debugColor?:      string
}

const ORGANS: OrganDef[] = [
  { key: 'heart',       anchor: 't5',  offset: [ 0.02,  0.00,  0.05], scale: [0.06, 0.07, 0.06], shape: 'sphere',   annotationOffset: [ 0.00,  0.10, 0.20], modelUrl: '/organs/heart.glb',       modelScale: 0.0006 },
  { key: 'lung_l',      anchor: 't5',  offset: [-0.03, -0.03,  0.03], scale: [0.08, 0.12, 0.07], shape: 'sphere',   annotationOffset: [-0.10,  0.10, 0.20], modelUrl: '/organs/lung_l.glb',      modelScale: 0.0008, rotateY: Math.PI },
  { key: 'lung_r',      anchor: 't5',  offset: [ 0.01, -0.03,  0.03], scale: [0.08, 0.12, 0.07], shape: 'sphere',   annotationOffset: [ 0.10,  0.10, 0.20], modelUrl: '/organs/lung_l.glb',      modelScale: 0.0008, flipX: true, rotateY: Math.PI },
  { key: 'liver',       anchor: 't12', offset: [-0.07,  0.02,  0.05], scale: [0.08, 0.06, 0.06], shape: 'sphere',   annotationOffset: [-0.10,  0.06, 0.18], modelUrl: '/organs/liver2.glb',      modelScale: 0.09  },
  { key: 'gallbladder', anchor: 't12', offset: [-0.06, -0.05,  0.05], scale: [0.03, 0.03, 0.03], shape: 'sphere',   annotationOffset: [-0.14,  0.00, 0.18], modelUrl: '/organs/gallbladder.glb', modelScale: 0.0004 },
  { key: 'stomach',     anchor: 't12', offset: [ 0.06, -0.01,  0.04], scale: [0.05, 0.05, 0.05], shape: 'sphere',   annotationOffset: [ 0.10,  0.06, 0.18], modelUrl: '/organs/stomach.glb',     modelScale: 0.08,  flipX: true },
  { key: 'spleen',      anchor: 't9',  offset: [ 0.09, -0.04,  0.03], scale: [0.05, 0.05, 0.04], shape: 'sphere',   annotationOffset: [ 0.14,  0.06, 0.18], modelUrl: '/organs/spleen.glb',      modelScale: 0.0004 },
  { key: 'pancreas',    anchor: 'l1',  offset: [ 0.02,  0.03,  0.04], scale: [0.06, 0.02, 0.03], shape: 'sphere',   annotationOffset: [ 0.06,  0.08, 0.18], modelUrl: '/organs/pancreas.glb',    modelScale: 0.0004 },
  { key: 'kidney_l',    anchor: 'l1',  offset: [ 0.08,  0.01, -0.01], scale: [0.04, 0.06, 0.03], shape: 'sphere',   annotationOffset: [ 0.14,  0.02, 0.18], modelUrl: '/organs/kidney_l.glb',    modelScale: 0.0004 },
  { key: 'kidney_r',    anchor: 'l1',  offset: [-0.08,  0.01, -0.01], scale: [0.04, 0.06, 0.03], shape: 'sphere',   annotationOffset: [-0.14,  0.02, 0.18], modelUrl: '/organs/kidney_r.glb',    modelScale: 0.0004 },
  { key: 'aorta',       anchor: 't5',  offset: [ 0.00, -0.19,  0.02], scale: [0.025, 0.20, 0.025], shape: 'cylinder', annotationOffset: [-0.12,  0.10, 0.18], modelUrl: '/organs/aorta.glb', modelScale: 0.022, rotateY: Math.PI },
  { key: 'bladder',     anchor: 'l5',  offset: [ 0.00, -0.08,  0.05], scale: [0.04, 0.04, 0.04], shape: 'sphere',   annotationOffset: [ 0.10,  0.04, 0.16], modelUrl: '/organs/bladder.glb',     modelScale: 0.0004 },
]

const ANCHORS_NEEDED = new Set(ORGANS.map(o => `${o.anchor}_beige_0`))

// Kick off all organ GLB loads before any component renders — prevents useGLTF from suspending mid-render
ORGANS.forEach(o => { if (o.modelUrl) useGLTF.preload(o.modelUrl) })

type Finding = { severity: Severity; label: string; displayName: string }

function ModelOrgan({ url, modelScale = 0.0007, flipX = false, rotateY = 0, debugColor, wx, wy, wz, finding, hasLabGlow }: {
  url:          string
  modelScale?:  number
  flipX?:       boolean
  rotateY?:     number
  debugColor?:  string
  wx:           number
  wy:           number
  wz:           number
  finding:      Finding | undefined
  hasLabGlow:   boolean
}) {
  const { scene } = useGLTF(url)

  const { geometries, center } = useMemo(() => {
    const meshes: THREE.Mesh[] = []
    scene.traverse(child => { if (child instanceof THREE.Mesh) meshes.push(child) })
    if (!meshes.length) return { geometries: [new THREE.SphereGeometry(0.5)], center: new THREE.Vector3() }
    const geometries = meshes.map(m => m.geometry.clone())
    const bbox = new THREE.Box3()
    geometries.forEach(g => { const posAttr = g.attributes.position as THREE.BufferAttribute; if (posAttr) bbox.expandByObject(new THREE.Mesh(g)) })
    const center = new THREE.Vector3()
    bbox.getCenter(center)
    return { geometries, center }
  }, [scene])

  const offset: [number, number, number] = [
    -center.x * modelScale,
    -center.y * modelScale,
    -center.z * modelScale,
  ]

  const wireColor   = debugColor ?? (finding ? WIRE_COLOR[finding.severity] : HEALTHY_COLOR)
  const wireOpacity = finding ? WIRE_OPACITY[finding.severity] : (debugColor ? 0.85 : HEALTHY_WIRE)
  const fillColor   = finding ? WIRE_COLOR[finding.severity] : LAB_CYAN
  const fillOpacity = finding ? FILL_OPACITY[finding.severity] : LAB_FILL_OPACITY

  const s: [number, number, number] = [flipX ? -modelScale : modelScale, modelScale, modelScale]

  return (
    <group position={[wx, wy, wz]} rotation={[0, rotateY, 0]}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} position={offset} scale={s}>
          <meshBasicMaterial color={wireColor} wireframe transparent opacity={wireOpacity} depthTest={false} />
        </mesh>
      ))}
      {(finding || hasLabGlow) && geometries.map((geometry, i) => (
        <mesh key={`fill-${i}`} geometry={geometry} position={offset} scale={s}>
          <meshBasicMaterial color={fillColor} transparent opacity={fillOpacity} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
        </mesh>
      ))}
    </group>
  )
}

function OrganFlag({ organPos, annotationPos, finding, portal }: {
  organPos:      [number, number, number]
  annotationPos: [number, number, number]
  finding:       Finding
  portal:        React.RefObject<HTMLElement>
}) {
  return (
    <>
      <Line
        points={[organPos, annotationPos]}
        color={WIRE_COLOR[finding.severity]}
        lineWidth={3}
        transparent
        opacity={0.45}
        depthTest={false}
      />
      <BoneAnnotation
        position={new THREE.Vector3(...annotationPos)}
        displayName={finding.displayName}
        label={finding.label}
        severity={finding.severity}
        portal={portal}
        occlude={false}
      />
    </>
  )
}

export function OrganLayer() {
  const { selectedSession, activeLayer, labsOn, labTargets } = useTimeline()
  const { scene } = useGLTF('/skeleton/skeleton_lo.glb')
  const organsActive = activeLayer === 'organs' || activeLayer === 'all'

  const labOrganSet = useMemo(
    () => new Set(labTargets.flatMap(t => t.organTargets)),
    [labTargets]
  )

  const portalRef = useRef<HTMLElement>(null!)
  useEffect(() => {
    const el = document.getElementById('bone-annotation-portal')
    if (el) portalRef.current = el as HTMLElement
  }, [])

  const bonePositionsRef = useRef<Record<string, THREE.Vector3>>({})
  const [positionsReady, setPositionsReady] = useState(false)

  useFrame(() => {
    if (positionsReady) return
    const found: Record<string, THREE.Vector3> = {}
    scene.traverse(child => {
      if (child instanceof THREE.Mesh && !child.userData?.isFill && ANCHORS_NEEDED.has(child.name)) {
        const p = new THREE.Vector3()
        child.getWorldPosition(p)
        found[child.name.replace('_beige_0', '')] = p
      }
    })
    if (Object.keys(found).length > 0) {
      bonePositionsRef.current = found
      setPositionsReady(true)
    }
  })

  const sessionFindings = useMemo(() => {
    const map: Record<string, Finding> = {}
    organConditionsData.conditions.forEach(c => {
      const h = c.history.find(h => h.session === selectedSession)
      if (h) map[c.organ] = { severity: h.severity as Severity, label: h.label, displayName: c.displayName }
    })
    return map
  }, [selectedSession])

  if (!positionsReady || !organsActive) return null

  return (
    <>
      {ORGANS.map(organ => {
        const anchor = bonePositionsRef.current[organ.anchor]
        if (!anchor) return null

        const wx = anchor.x + organ.offset[0]
        const wy = anchor.y + organ.offset[1]
        const wz = anchor.z + organ.offset[2]

        const finding    = sessionFindings[organ.key]
        const hasLabGlow = labsOn && labOrganSet.has(organ.key) && !finding

        return (
          <group key={organ.key}>
            {organ.modelUrl ? (
              <Suspense fallback={null}>
                <ModelOrgan
                  url={organ.modelUrl}
                  modelScale={organ.modelScale}
                  flipX={organ.flipX}
                  rotateY={organ.rotateY}
                  debugColor={organ.debugColor}
                  wx={wx} wy={wy} wz={wz}
                  finding={finding}
                  hasLabGlow={hasLabGlow}
                />
              </Suspense>
            ) : (
              <group position={[wx, wy, wz]} scale={organ.scale}>
                <mesh>
                  {organ.shape === 'cylinder'
                    ? <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
                    : <sphereGeometry args={[0.5, 16, 12]} />
                  }
                  <meshBasicMaterial
                    color={finding ? WIRE_COLOR[finding.severity] : HEALTHY_COLOR}
                    wireframe
                    transparent
                    opacity={finding ? WIRE_OPACITY[finding.severity] : HEALTHY_WIRE}
                    depthTest={false}
                  />
                </mesh>
                {finding && (
                  <mesh>
                    {organ.shape === 'cylinder'
                      ? <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
                      : <sphereGeometry args={[0.5, 16, 12]} />
                    }
                    <meshBasicMaterial
                      color={WIRE_COLOR[finding.severity]}
                      transparent
                      opacity={FILL_OPACITY[finding.severity]}
                      side={THREE.DoubleSide}
                      depthWrite={false}
                      depthTest={false}
                    />
                  </mesh>
                )}
                {hasLabGlow && (
                  <mesh>
                    {organ.shape === 'cylinder'
                      ? <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
                      : <sphereGeometry args={[0.5, 16, 12]} />
                    }
                    <meshBasicMaterial
                      color={LAB_CYAN}
                      transparent
                      opacity={LAB_FILL_OPACITY}
                      side={THREE.DoubleSide}
                      depthWrite={false}
                      depthTest={false}
                    />
                  </mesh>
                )}
              </group>
            )}

            {finding && organsActive && <OrganFlag
              organPos={[wx, wy, wz]}
              annotationPos={[
                wx + organ.annotationOffset[0],
                wy + organ.annotationOffset[1],
                wz + organ.annotationOffset[2],
              ]}
              finding={finding}
              portal={portalRef}
            />}
          </group>
        )
      })}
    </>
  )
}

