import { TopNav }          from '@/components/TopNav'
import { LeftPanel }        from '@/components/LeftPanel'
import { RightPanel }       from '@/components/RightPanel'
import { FooterNav }        from '@/components/FooterNav'
import { LayerToggles }     from '@/components/LayerToggles'
import { BodyViewerLoader } from '@/components/BodyViewerLoader'
import { TimelineProvider } from '@/context/TimelineContext'

export default function Home() {
  return (
    <TimelineProvider>
    <div className="fixed inset-0 bg-[#080808] overflow-hidden">

      {/* 3D body — explicit z-0 keeps it below all panels */}
      <div className="absolute inset-0 z-0">
        <BodyViewerLoader />
      </div>

      {/* Top nav floats above everything */}
      <TopNav />

      {/* Panels — translate3d forces own compositor layer so they render above WebGL */}
      <div className="absolute inset-0 top-14 bottom-0 flex justify-between pointer-events-none z-10 [transform:translate3d(0,0,0)]">
        <div className="pointer-events-auto h-full">
          <LeftPanel />
        </div>
        <div className="pointer-events-auto h-full">
          <RightPanel />
        </div>
      </div>

      {/* Footer timeline nav */}
      <FooterNav />

      {/* Layer toggles — bottom-left, matches footer nav height */}
      <LayerToggles />

      {/* Bone annotation portal — sits above panels so drei Html annotations are never clipped by panel stacking context */}
      <div id="bone-annotation-portal" className="absolute inset-0 z-[5] pointer-events-none" />

    </div>
    </TimelineProvider>
  )
}
