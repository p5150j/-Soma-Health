'use client'
import dynamic from 'next/dynamic'

const BodyViewer = dynamic(() => import('./BodyViewer'), { ssr: false })

export function BodyViewerLoader() {
  return <BodyViewer />
}
