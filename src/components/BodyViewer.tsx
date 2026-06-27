'use client'
import React, { useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import conditionsData from '@/data/conditions_real.json'
import { useTimeline } from '@/context/TimelineContext'
import { BoneAnnotation, Severity } from './BoneAnnotation'
import { OrganLayer } from './OrganLayer'

interface ConditionEntry {
  bone:        string
  severity:    Severity
  label:       string
  displayName: string
}

const WIRE_COLOR:   Record<Severity, string> = { watch: '#f5c542', critical: '#ff453a' }
const FILL_OPACITY: Record<Severity, number> = { watch: 0.12,      critical: 0.18      }
const LAB_CYAN = '#4fc3f7'
const LAB_FILL_OPACITY = 0.14

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
  const { scene }                        = useGLTF('/skeleton/skeleton_lo.glb')
  const { selectedSession, activeLayer, labsOn, labTargets } = useTimeline()

  const portalRef = useRef<HTMLElement>(null!)
  useEffect(() => {
    const el = document.getElementById('bone-annotation-portal')
    if (el) portalRef.current = el
  }, [])

  const offset = useMemo(() => {
    const box    = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box.getCenter(center)
    return center
  }, [scene])

  const bonesActive = activeLayer === 'bones' || activeLayer === 'all'

  const labBoneSet = useMemo(
    () => new Set(labTargets.flatMap(t => t.boneTargets)),
    [labTargets]
  )

  const annotations = useMemo(() => {
    const bonesOpacity = bonesActive ? 1.0 : 0.0

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
      const condition  = sessionLookup[child.name]
      const hasLabGlow = labsOn && labBoneSet.has(child.name) && !condition

      child.material = new THREE.MeshBasicMaterial({
        color:       condition ? WIRE_COLOR[condition.severity] : '#c8dff0',
        wireframe:   true,
        transparent: true,
        opacity:     condition ? 0.85 * bonesOpacity : 0.18 * bonesOpacity,
      })

      if (condition) {
        const solid = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({
            color:       WIRE_COLOR[condition.severity],
            transparent: true,
            opacity:     FILL_OPACITY[condition.severity] * bonesOpacity,
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
      } else if (hasLabGlow) {
        const glow = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({
            color:       LAB_CYAN,
            transparent: true,
            opacity:     LAB_FILL_OPACITY * bonesOpacity,
            side:        THREE.DoubleSide,
            depthWrite:  false,
          })
        )
        glow.userData = { isFill: true }
        child.add(glow)
      }
    })

    return anns
  }, [scene, selectedSession, bonesActive, labsOn, labBoneSet])

  return (
    <group position={[-offset.x, -offset.y, -offset.z]}>
      <primitive object={scene} />
      <ambientLight intensity={0.6} />
      {bonesActive && annotations.map(({ position, condition }) => (
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
      <OrganLayer />
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
