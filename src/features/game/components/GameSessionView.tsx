import { useMemo, useEffect } from 'react'
import { useMockGame } from '../hooks/useMockGame'
import { useGameSocket } from '../hooks/useGameSocket'
import { useRealtimeKit } from '../hooks/useRealtimeKit'
import { useGameUI } from '../../../context/GameUIContext'
import PlayerCard from './PlayerCard'
import { Shield, Clock, Users, Radio } from 'lucide-react'
import type { ServerPhase } from '../types'

interface GameSessionViewProps {
  currentPhase?: string
  sessionId?: string
  roomCode?: string
}

export default function GameSessionView({ currentPhase = 'day', sessionId = '8', roomCode }: GameSessionViewProps) {
  const { accessToken } = useGameUI()

  const socket = useGameSocket(sessionId, accessToken)
  const mock = useMockGame()

  // ── RealtimeKit video ──
  const rt = useRealtimeKit(roomCode ?? null)

  // Sync mute/camera from RealtimeKit into our context
  const { isMuted: rtMuted, isCameraOff: rtCameraOff } = useGameUI()
  useEffect(() => {
    if (rt.isJoined) {
      // Mirror state if needed — RealtimeKit is source of truth for media
    }
  }, [rt.isJoined, rtMuted, rtCameraOff])

  const useReal = !!(accessToken && socket.isConnected)
  const players = useReal ? socket.players : mock.players
  const localPlayer = useReal ? players.find((p) => p.id === 'local') ?? players[0] : mock.localPlayer
  const localRole = useReal ? socket.localRole : localPlayer?.role ?? null
  const phase: ServerPhase = (currentPhase as ServerPhase) || 'day'
  const round = useReal ? socket.roundNumber : mock.round
  const showTargeted = phase === 'night'

  // Map RealtimeKit participants to player cards by name
  const trackMap = useMemo(() => {
    const map = new Map<string, MediaStreamTrack>()
    if (!rt.isJoined) return map
    for (const [id, p] of rt.participants) {
      if (p.videoTrack) map.set(p.name, p.videoTrack)
    }
    return map
  }, [rt.isJoined, rt.participants])

  const gridCols = useMemo(() => {
    const c = players.length
    if (c <= 2) return 'grid-cols-2'; if (c <= 4) return 'grid-cols-2'
    if (c <= 6) return 'grid-cols-3'; return 'grid-cols-4'
  }, [players.length])

  return (
    <div className="flex h-full w-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Round {round}</span>
          <span className="h-4 w-px bg-[var(--border-dim)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent-slate)]">
            {phase === 'night' ? 'Night Phase' : phase === 'voting' ? 'Voting Phase' : 'Day Phase'}
          </span>
          <span className="ml-auto rounded-full bg-[var(--bg-raised)] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-[var(--text-muted)]">{players.filter((p) => p.isAlive).length} alive</span>
          {useReal && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Live</span>}
          {rt.isJoined && <Radio size={13} className="text-emerald-400/70" />}
        </div>
        <div className={`grid flex-1 gap-3 p-4 ${gridCols} auto-rows-fr content-center`}>
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} showTargeted={showTargeted} localPlayer={localPlayer}
              localRole={localRole} currentPhase={phase}
              onAction={useReal ? socket.send : mock.onAction}
              videoTrack={trackMap.get(p.name) ?? null} />
          ))}
        </div>
      </div>

      <aside className="hidden w-[320px] shrink-0 flex-col gap-4 border-l border-[var(--border-subtle)] bg-[var(--color-background)]/40 p-5 lg:flex">
        <div className="flex items-center gap-2"><Shield size={14} className="text-[var(--text-muted)]" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Game Panel</span></div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)]/40 p-4">
          <div className="mb-3 flex items-center gap-2"><Clock size={13} className="text-[var(--text-muted)]" /><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Current Phase</span></div>
          <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{phase} Phase</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{phase === 'night' ? 'Night roles are active.' : phase === 'voting' ? 'Cast your vote.' : 'Discussion underway.'}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)]/40 p-4">
          <div className="mb-3 flex items-center gap-2"><Users size={13} className="text-[var(--text-muted)]" /><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Players</span></div>
          <ul className="flex flex-col gap-2">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-xs">
                <span className={p.isAlive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] line-through'}>{p.name}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${p.isAlive ? 'text-[var(--text-muted)]' : 'text-[var(--color-accent-crimson)]/60'}`}>{p.isAlive ? 'Alive' : 'Dead'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center">
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            {rt.isJoined ? 'Video connected' : useReal ? 'Connected to server' : 'Mock mode'}
            <br /><span className="text-[var(--text-muted)]/60">{rt.isJoined ? 'RealtimeKit active' : useReal ? `Session #${sessionId}` : 'No backend'}</span>
          </p>
        </div>
      </aside>
    </div>
  )
}
