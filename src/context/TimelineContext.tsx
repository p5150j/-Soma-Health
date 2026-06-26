'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import conditionsData from '@/data/conditions_real.json'

export interface Session {
  id:     string
  label:  string
  year:   string
  status: string | null
}

interface TimelineContextValue {
  sessions:           Session[]
  selectedSession:    string
  setSelectedSession: (id: string) => void
}

const TimelineContext = createContext<TimelineContextValue>(null!)

export function TimelineProvider({ children }: { children: ReactNode }) {
  const sessions = conditionsData.sessions as Session[]
  const [selectedSession, setSelectedSession] = useState(sessions[sessions.length - 1].id)

  return (
    <TimelineContext.Provider value={{ sessions, selectedSession, setSelectedSession }}>
      {children}
    </TimelineContext.Provider>
  )
}

export function useTimeline() {
  return useContext(TimelineContext)
}
