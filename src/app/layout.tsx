import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://soma.health'),
  title: 'Soma — Your health, fully understood.',
  description: 'Your health data tells a story medicine keeps buried. Soma surfaces it — 3D anatomy, biomarker trends, and AI-powered synthesis of your complete medical record.',
  openGraph: {
    title: 'Soma — Your health, fully understood.',
    description: 'Your health data tells a story medicine keeps buried. Soma surfaces it — 3D anatomy, biomarker trends, and AI-powered synthesis of your complete medical record.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1280, height: 800 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soma — Your health, fully understood.',
    description: 'Your health data tells a story medicine keeps buried. Soma surfaces it — 3D anatomy, biomarker trends, and AI-powered synthesis of your complete medical record.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
<body className="min-h-full">{children}</body>
    </html>
  )
}
