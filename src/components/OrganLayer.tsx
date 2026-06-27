'use client'
import React, { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Line } from '@react-three/drei'
import { BoneAnnotation, Severity } from './BoneAnnotation'
import { useTimeline } from '@/context/TimelineContext'
import organConditionsData from '@/data/conditions_organs.json'

const WIRE_COLOR:   Record<Severity, string> = { watch: '#f5c542', critical: '#ff453a' }
const WIRE_OPACITY: Record<Severity, number> = { watch: 0.70,      critical: 0.85 }
const FILL_OPACITY: Record<Severity, number> = { watch: 0.18,      critical: 0.26 }
const HEALTHY_COLOR = '#c8dff0'
const HEALTHY_WIRE  = 0.28

interface OrganDef {
  key:              string
  anchor:           string
  offset:           [number, number, number]
  scale:            [number, number, number]
  shape:            'sphere' | 'cylinder'
  annotationOffset: [number, number, number]
  modelUrl?:        string
  modelScale?:      number
}

const ORGANS: OrganDef[] = [
  { key: 'heart',    anchor: 't5',  offset: [-0.02,  0.00,  0.05], scale: [0.06, 0.07, 0.06], shape: 'sphere',   annotationOffset: [ 0.00,  0.10, 0.20] },
  { key: 'lung_l',   anchor: 't5',  offset: [-0.07, -0.04,  0.02], scale: [0.08, 0.12, 0.07], shape: 'sphere',   annotationOffset: [-0.10,  0.10, 0.20] },
  { key: 'lung_r',   anchor: 't5',  offset: [ 0.07, -0.04,  0.02], scale: [0.08, 0.12, 0.07], shape: 'sphere',   annotationOffset: [ 0.10,  0.10, 0.20] },
  { key: 'liver',    anchor: 't12', offset: [ 0.07, -0.02,  0.05], scale: [0.08, 0.06, 0.06], shape: 'sphere',   annotationOffset: [ 0.10,  0.06, 0.18] },
  { key: 'stomach',  anchor: 't12', offset: [-0.03,  0.01,  0.05], scale: [0.05, 0.05, 0.05], shape: 'sphere',   annotationOffset: [-0.10,  0.06, 0.18] },
  { key: 'spleen',   anchor: 't9',  offset: [-0.09, -0.04,  0.03], scale: [0.05, 0.05, 0.04], shape: 'sphere',   annotationOffset: [-0.14,  0.06, 0.18] },
  { key: 'pancreas', anchor: 'l1',  offset: [-0.02,  0.03,  0.04], scale: [0.06, 0.02, 0.03], shape: 'sphere',   annotationOffset: [-0.06,  0.08, 0.18] },
  { key: 'kidney_l', anchor: 'l1',  offset: [-0.08,  0.01, -0.01], scale: [0.04, 0.06, 0.03], shape: 'sphere',   annotationOffset: [-0.14,  0.02, 0.18] },
  { key: 'kidney_r', anchor: 'l1',  offset: [ 0.08,  0.01, -0.01], scale: [0.04, 0.06, 0.03], shape: 'sphere',   annotationOffset: [ 0.14,  0.02, 0.18] },
  { key: 'aorta',    anchor: 'l1',  offset: [ 0.01,  0.06, -0.02], scale: [0.025, 0.20, 0.025], shape: 'cylinder', annotationOffset: [ 0.10,  0.12, 0.18] },
  { key: 'bladder',  anchor: 'l5',  offset: [ 0.00, -0.08,  0.05], scale: [0.04, 0.04, 0.04], shape: 'sphere',   annotationOffset: [ 0.10,  0.04, 0.16] },
]

const ANCHORS_NEEDED = new Set(ORGANS.map(o => `${o.anchor}_beige_0`))

type Finding = { severity: Severity; label: string; displayName: string }

// Renders a GLTF organ model as clean edge lines (like bones) centered on (wx,wy,wz)
function ModelOrgan({ url, modelScale = 0.05, wx, wy, wz, finding }: {
  url:         string
  modelScale?: number
  wx:          number
  wy:          number
  wz:          number
  finding:     Finding | undefined
}) {
  const { scene } = useGLTF(url)

  // Extract EdgesGeometry from the most compact mesh — computed once per scene load
  const { edges, center } = useMemo(() => {
    const meshes: THREE.Mesh[] = []
    scene.traverse(child => { if (child instanceof THREE.Mesh) meshes.push(child) })
    meshes.forEach(m => m.geometry.computeBoundingSphere())
    const target = meshes.reduce((a, b) =>
      (a.geometry.boundingSphere?.radius ?? Infinity) <= (b.geometry.boundingSphere?.radius ?? Infinity) ? a : b
    )
    // EdgesGeometry with 15° crease — only draws silhouette + sharp feature edges, not every tri
    const edges  = new THREE.EdgesGeometry(target.geometry, 15)
    const bbox   = new THREE.Box3().setFromBufferAttribute(
      target.geometry.attributes.position as THREE.BufferAttribute
    )
    const center = new THREE.Vector3()
    bbox.getCenter(center)
    return { edges, center }
  }, [scene])

  const wireColor   = finding ? WIRE_COLOR[finding.severity] : HEALTHY_COLOR
  const wireOpacity = finding ? WIRE_OPACITY[finding.severity] : HEALTHY_WIRE

  return (
    <group position={[wx, wy, wz]}>
      <lineSegments
        geometry={edges}
        position={[-center.x * modelScale, -center.y * modelScale, -center.z * modelScale]}
        scale={modelScale}
      >
        <lineBasicMaterial color={wireColor} opacity={wireOpacity} transparent depthTest={false} />
      </lineSegments>
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
        lineWidth={1}
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
  const { selectedSession, activeLayer } = useTimeline()
  const { scene } = useGLTF('/skeleton/skeleton_lo.glb')
  const organsActive = activeLayer === 'organs' || activeLayer === 'all'

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

        const finding = sessionFindings[organ.key]

        return (
          <group key={organ.key}>
            {organ.modelUrl ? (
              <ModelOrgan
                url={organ.modelUrl}
                modelScale={organ.modelScale}
                wx={wx} wy={wy} wz={wz}
                finding={finding}
                />
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

