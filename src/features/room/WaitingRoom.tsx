import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGameUI } from '../../context/GameUIContext'
import { useRoomSocket } from '../game/hooks/useRoomSocket'
import { api } from '../../lib/api'
import type { MemberListResponse } from '../../lib/api'
import { Check, Link, Users, Shield, EyeOff, Clock, Play, ArrowLeft, MicOff, VideoOff } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

/* ──────────────────────────────────────────────
   Mini player card for pre-game waiting room
   ────────────────────────────────────────────── */
function WaitingCard({ name, isHost, isSelf, isReady, isMuted }: { name: string; isHost: boolean; isSelf: boolean; isReady: boolean; isMuted: boolean }) {
  return (
    <motion.div className="group relative flex aspect-[4/3] flex-col overflow-hidden rounded-2xl border border-[var(--border-dim)] bg-[var(--color-surface)] transition-all duration-300 hover:border-[var(--border-hover)]"
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} layout>
      <div className="relative flex flex-1 items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-10 w-10 text-zinc-700"><circle cx="12" cy="9" r="4" /><path d="M5 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-xs font-semibold text-[var(--text-primary)]">{name}</span>
            {isSelf && <span className="shrink-0 text-[10px] text-[var(--text-muted)]">(You)</span>}
            {isHost && <span className="shrink-0 rounded-md border border-[var(--color-accent-slate)]/25 bg-[var(--color-accent-slate)]/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent-slate)]">Host</span>}
          </div>
          {isMuted && <MicOff size={12} className="text-[var(--color-accent-crimson)]/70" />}
        </div>
      </div>
      <AnimatePresence>
        {isReady && (
          <motion.div className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-400 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />Ready
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   Copy link
   ────────────────────────────────────────────── */
function CopyLink() {
  const [state, setState] = useState<'idle' | 'copied'>('idle')
  const h = async () => { try { await navigator.clipboard.writeText(window.location.href) } catch { /* */ } setState('copied'); setTimeout(() => setState('idle'), 2200) }
  return (
    <div className="relative inline-flex">
      <button onClick={h} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-all duration-200 ${state === 'copied' ? 'border-emerald-400/20 bg-emerald-400/8 text-emerald-400' : 'border-[var(--border-dim)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'}`}>
        {state === 'copied' ? <><Check size={14} />Copied!</> : <><Link size={14} />Copy Link</>}
      </button>
      {state === 'copied' && <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-medium text-emerald-400 shadow-lg shadow-emerald-400/5">Link copied to clipboard</span>}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Waiting Room — REST member list + WS updates
   ────────────────────────────────────────────── */
export default function WaitingRoom() {
  const { roomCode, matchSettings, accessToken, username, isMuted, logout, toggleReady } = useGameUI()
  const navigate = useNavigate()

  // Real room WebSocket for live join/leave events
  const roomSocket = useRoomSocket(roomCode, accessToken)
  const useReal = !!(accessToken && roomSocket.isConnected)

  // REST: fetch member list on mount
  const [restMembers, setRestMembers] = useState<MemberListResponse | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!accessToken || !roomCode || roomCode === '----') return
    try {
      const data = await api.getMembers(roomCode, accessToken)
      setRestMembers(data)
      setFetchError(null)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load members')
    }
  }, [accessToken, roomCode])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // Build player list: prefer real data, fallback to mock
  const rawPlayers = useMemo(() => {
    if (restMembers) {
      return restMembers.members.map((m) => ({
        id: String(m.id),
        name: m.username,
        isHost: m.id === restMembers.host.id,
        isReady: false, // TODO: track readiness via WS/state
      }))
    }
    // Mock fallback
    return [
      { id: 'host-1', name: username ?? 'You', isHost: true, isReady: true },
      { id: 'p-2', name: 'Marco', isHost: false, isReady: false },
      { id: 'p-3', name: 'Elena', isHost: false, isReady: true },
    ]
  }, [restMembers, username])

  const loggedInUserId = restMembers?.host?.id
  const currentPlayer = rawPlayers[0]
  const isHost = currentPlayer?.isHost ?? true
  const playerCount = restMembers?.member_count ?? rawPlayers.length
  const maxMembers = restMembers?.max_members ?? 8
  const MIN_PLAYERS = 5
  const thresholdMet = playerCount >= MIN_PLAYERS

  const gridCols = useMemo(() => {
    const c = rawPlayers.length
    if (c <= 2) return 'grid-cols-2'
    if (c <= 6) return 'grid-cols-3'
    return 'grid-cols-4'
  }, [rawPlayers.length])

  // Navigate when game starts (via WS)
  useEffect(() => {
    if (roomSocket.sessionId) {
      navigate({ to: '/game/$sessionId', params: { sessionId: String(roomSocket.sessionId) } })
    }
  }, [roomSocket.sessionId, navigate])

  const handleStartGame = () => {
    if (useReal) { roomSocket.startGame() }
    else { navigate({ to: '/game/$sessionId', params: { sessionId: roomCode } }) }
  }

  const handleLeave = () => { logout(); navigate({ to: '/' }) }

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-background)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--color-background)]/80 backdrop-blur-md px-6">
        <div className="flex items-center gap-4">
          <span className="select-none text-sm font-bold tracking-[0.3em] text-[var(--text-primary)]">MAFIA</span>
          <span className="hidden h-4 w-px bg-[var(--border-dim)] sm:block" />
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] sm:inline">Room Code</span>
            <span className="select-all font-mono text-sm font-bold tracking-[0.25em] text-[var(--text-primary)]">{roomCode}</span>
            <CopyLink />
          </div>
          {useReal && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Live</span>}
          {fetchError && <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400/80">REST offline — WS only</span>}
        </div>
        <button onClick={handleLeave} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"><ArrowLeft size={13} />Leave</button>
      </header>

      <main className="flex flex-1 items-stretch overflow-hidden">
        <div className="flex w-full flex-col gap-0 lg:flex-row">
          {/* Left — Video Card Grid */}
          <section className="flex flex-1 flex-col border-b border-[var(--border-subtle)] lg:border-b-0 lg:border-r lg:border-[var(--border-subtle)] overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-6 py-4">
              <Users size={15} className="text-[var(--text-muted)]" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Pre-Game Lobby</h3>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors duration-300 ${thresholdMet ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[var(--bg-raised)] text-[var(--text-muted)]'}`}>
                {playerCount} / {maxMembers}
              </span>
              {!thresholdMet && <span className="rounded-full bg-amber-400/8 px-2 py-0.5 text-[10px] font-medium text-amber-400/80">Need {MIN_PLAYERS}+</span>}
            </div>

            <div className={`grid flex-1 gap-3 p-4 ${gridCols} auto-rows-fr content-center overflow-y-auto`}>
              {rawPlayers.map((p) => (
                <WaitingCard key={p.id} name={p.name} isHost={p.isHost} isSelf={p.id === String(loggedInUserId ?? 'host-1')} isReady={p.isReady} isMuted={p.id !== String(loggedInUserId ?? 'host-1')} />
              ))}
              {rawPlayers.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-[var(--text-muted)]">Waiting for players to join…</p>
                  <p className="text-xs text-[var(--text-muted)]/60">Share the room code to invite friends.</p>
                </div>
              )}
            </div>
          </section>

          {/* Right — Match Controls */}
          <section className="flex w-full flex-col gap-6 lg:w-[360px] lg:shrink-0 p-6">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-surface)]/40 p-5">
              <div className="mb-4 flex items-center gap-2"><Shield size={14} className="text-[var(--text-muted)]" /><h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Match Rules</h4></div>
              <ul className="flex flex-col gap-3">
                <li className="flex items-center justify-between"><div className="flex items-center gap-2"><EyeOff size={13} className="text-[var(--text-muted)]" /><span className="text-xs text-[var(--text-secondary)]">Anonymous Voting</span></div><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${matchSettings.anonymousVoting ? 'bg-emerald-400/8 text-emerald-400' : 'bg-zinc-700/30 text-zinc-500'}`}>{matchSettings.anonymousVoting ? 'On' : 'Off'}</span></li>
                <li className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock size={13} className="text-[var(--text-muted)]" /><span className="text-xs text-[var(--text-secondary)]">Day Phase</span></div><span className="rounded-full bg-[var(--bg-raised)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{matchSettings.dayTimer}</span></li>
                <li className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock size={13} className="text-[var(--text-muted)]" /><span className="text-xs text-[var(--text-secondary)]">Night Phase</span></div><span className="rounded-full bg-[var(--bg-raised)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{matchSettings.nightTimer}</span></li>
                <li className="flex items-center justify-between"><div className="flex items-center gap-2"><Users size={13} className="text-[var(--text-muted)]" /><span className="text-xs text-[var(--text-secondary)]">Min Players</span></div><span className="rounded-full bg-[var(--bg-raised)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{MIN_PLAYERS}</span></li>
              </ul>
              <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">Host-configured for fair match integrity.</p>
            </div>

            <div className="mt-auto">
              {isHost ? (
                <button disabled={!thresholdMet} onClick={handleStartGame}
                  className={`group relative w-full overflow-hidden rounded-2xl border py-5 text-sm font-bold uppercase tracking-[0.15em] transition-all duration-300 ${thresholdMet ? 'border-[var(--color-accent-slate)]/40 bg-[var(--color-accent-slate)] text-white shadow-lg shadow-[var(--color-accent-slate)]/25 hover:shadow-xl hover:shadow-[var(--color-accent-slate)]/35 hover:scale-[1.01] cursor-pointer' : 'cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-raised)] text-[var(--text-muted)] opacity-50'} active:scale-[0.98]`}>
                  {thresholdMet && <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />}
                  <span className="relative inline-flex items-center gap-2.5"><Play size={18} />{thresholdMet ? 'Start Game' : `Waiting for ${MIN_PLAYERS - playerCount} more player${MIN_PLAYERS - playerCount > 1 ? 's' : ''}…`}</span>
                </button>
              ) : (
                <button onClick={() => toggleReady(currentPlayer?.id ?? '')}
                  className={`group relative w-full overflow-hidden rounded-2xl border py-5 text-sm font-bold uppercase tracking-[0.15em] transition-all duration-300 ${currentPlayer?.isReady ? 'border-[var(--border-hover)] bg-[var(--bg-raised)] text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] cursor-pointer' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 shadow-lg shadow-emerald-400/10 hover:shadow-xl hover:shadow-emerald-400/15 hover:scale-[1.01] cursor-pointer'} active:scale-[0.98]`}>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative inline-flex items-center gap-2.5"><Check size={18} />{currentPlayer?.isReady ? 'Unready' : 'Ready Up'}</span>
                </button>
              )}
            </div>
            <p className="text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
              {isHost ? (thresholdMet ? 'Everyone is here. Start the match when ready.' : `Need at least ${MIN_PLAYERS} players.`) : (currentPlayer?.isReady ? 'You are confirmed. Waiting for the host to start.' : 'Tap Ready Up to confirm.')}
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
