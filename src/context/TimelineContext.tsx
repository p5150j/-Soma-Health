'use client'
import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import conditionsData    from '@/data/conditions_real.json'
import labHighlightsData from '@/data/lab-highlights.json'

export interface Session {
  id:     string
  label:  string
  year:   string
  status: string | null
}

export type LayerMode = 'bones' | 'organs' | 'all' | 'none'

export interface LabHighlight {
  session:      string
  marker:       string
  label:        string
  value:        string
  unit:         string
  note:         string
  severity:     'watch' | 'critical'
  boneTargets:  string[]
  organTargets: string[]
}

interface TimelineContextValue {
  sessions:           Session[]
  selectedSession:    string
  setSelectedSession: (id: string) => void
  activeLayer:        LayerMode
  setActiveLayer:     (l: LayerMode) => void
  labsOn:             boolean
  setLabsOn:          (v: boolean) => void
  labTargets:         LabHighlight[]
}

const TimelineContext = createContext<TimelineContextValue>(null!)

export function TimelineProvider({ children }: { children: ReactNode }) {
  const sessions = conditionsData.sessions as Session[]
  const [selectedSession, setSelectedSession] = useState(sessions[sessions.length - 1].id)
  const [activeLayer, setActiveLayer]         = useState<LayerMode>('all')
  const [labsOn, setLabsOn]                   = useState(true)

  const labTargets = useMemo(
    () => (labHighlightsData.highlights as LabHighlight[]).filter(h => h.session === selectedSession),
    [selectedSession]
  )

  return (
    <TimelineContext.Provider value={{ sessions, selectedSession, setSelectedSession, activeLayer, setActiveLayer, labsOn, setLabsOn, labTargets }}>
      {children}
    </TimelineContext.Provider>
  )
}

export function useTimeline() {
  return useContext(TimelineContext)
}
