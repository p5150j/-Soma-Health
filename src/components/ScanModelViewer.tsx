'use client'
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'

function SpinMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const ref = useRef<THREE.Group>(null)

  // Auto-center and scale to fill view
  const box = new THREE.Box3().setFromObject(scene)
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  box.getCenter(center)
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = maxDim > 0 ? 1.6 / maxDim : 1

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.35
  })

  return (
    <group ref={ref} position={[-center.x * scale, -center.y * scale, -center.z * scale]} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

function Fallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#333" />
    </mesh>
  )
}

export function ScanModelViewer({ modelUrl }: { modelUrl: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      className="bg-transparent"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 2]} intensity={1.2} />
      <directionalLight position={[-2, -2, -1]} intensity={0.3} color="#88aaff" />
      <Suspense fallback={<Fallback />}>
        <SpinMesh url={modelUrl} />
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  )
}
