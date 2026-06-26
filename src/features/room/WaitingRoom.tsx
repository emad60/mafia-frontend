import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGameUI } from '../../context/GameUIContext'
import { useRoomSocket } from '../game/hooks/useRoomSocket'
import { useRealtimeKit } from '../game/hooks/useRealtimeKit'
import { api } from '../../lib/api'
import type { MemberListResponse } from '../../lib/api'
import { Check, Link, Users, Shield, EyeOff, Clock, Play, ArrowLeft, MicOff, Mic, Video, VideoOff, Radio } from 'lucide-react'
import { UserMenu } from '../../components'
import { motion, AnimatePresence } from 'motion/react'

function VideoFeed({ track, muted, label }: { track: MediaStreamTrack; muted: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) { console.log(`[VideoFeed:${label}] no video element ref`); return }
    const stream = new MediaStream([track])
    el.srcObject = stream
    el.onloadedmetadata = () => { console.log(`[VideoFeed:${label}] metadata loaded`) }
    el.onplay = () => { console.log(`[VideoFeed:${label}] playing`); setPlaying(true) }
    el.onerror = (e) => { console.error(`[VideoFeed:${label}] error:`, e) }
    console.log(`[VideoFeed:${label}] set srcObject, track kind=${track.kind}, enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`)
    return () => { el.srcObject = null }
  }, [track, label])
  return (
    <>
      <video ref={ref} autoPlay playsInline muted={muted} className="absolute inset-0 h-full w-full object-cover" />
      {!playing && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-500">Loading video…</span>}
    </>
  )
}

function WaitingCard({ name, isHost, isSelf, isReady, isMuted, videoTrack, trackLabel }: {
  name: string; isHost: boolean; isSelf: boolean; isReady: boolean; isMuted: boolean
  videoTrack?: MediaStreamTrack | null; trackLabel: string
}) {
  const hasVideo = !!videoTrack
  useEffect(() => {
    if (hasVideo) console.log(`[WaitingCard:${name}] got video track! kind=${videoTrack!.kind}`)
  }, [hasVideo, name, videoTrack])

  return (
    <motion.div className="group relative flex aspect-[4/3] flex-col overflow-hidden rounded-2xl border border-[var(--border-dim)] bg-[#18181B] transition-all duration-300 hover:border-[var(--border-hover)]"
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} layout>
      <div className="relative flex flex-1 items-center justify-center">
        {videoTrack ? (
          <VideoFeed track={videoTrack} muted={isSelf} label={name} />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-10 w-10 text-zinc-700"><circle cx="12" cy="9" r="4" /><path d="M5 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5 pointer-events-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-xs font-semibold text-white/90 drop-shadow">{name}</span>
            {isSelf && <span className="shrink-0 text-[10px] text-white/60">(You)</span>}
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

interface WaitingRoomProps {
  roomCode: string
}

export default function WaitingRoom({ roomCode }: WaitingRoomProps) {
  const { setRoomCode, matchSettings, accessToken, username, isMuted, logout, toggleReady } = useGameUI()
  const navigate = useNavigate()

  // Sync URL param → context
  useEffect(() => {
    if (roomCode && roomCode !== '----') setRoomCode(roomCode)
  }, [roomCode, setRoomCode])

  // WebSocket — auto-connects, receives room_state on connect
  const roomSocket = useRoomSocket(roomCode, accessToken)
  const useReal = !!(accessToken && roomSocket.isConnected)

  // Use WS room_state data when available (preferred), REST as fallback
  const wsMembers = useMemo(() =>
    roomSocket.members.map((m) => ({
      id: String(m.user_id), name: m.username,
      isHost: m.isHost || m.user_id === roomSocket.hostId, isReady: m.isReady,
    })),
  [roomSocket.members, roomSocket.hostId])

  // REST: fetch member list (fallback). Wait for WS room_state first
  // to avoid race condition where REST fires before WS add_member commits.
  const [restMembers, setRestMembers] = useState<MemberListResponse | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const wsReady = roomSocket.members.length > 0

  const fetchMembers = useCallback(async () => {
    if (!accessToken || !roomCode || roomCode === '----') return
    // Skip REST if WS already gave us room_state
    if (wsReady) return
    // Also skip until WS is actually connected (avoids pre-add_member race)
    if (!roomSocket.isConnected) return
    try {
      const data = await api.getMembers(roomCode, accessToken)
      setRestMembers(data)
      setFetchError(null)
    } catch (err) {
      if (!(err instanceof Error && err.message.includes('403'))) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load members')
      }
    }
  }, [accessToken, roomCode, wsReady, roomSocket.isConnected])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // Build player list: prefer WS room_state, fall back to REST, then mock
  const rawPlayers = useMemo(() => {
    if (wsMembers.length > 0) return wsMembers
    if (restMembers) {
      return restMembers.members.map((m) => ({
        id: String(m.id), name: m.username,
        isHost: m.id === restMembers.host.id, isReady: false,
      }))
    }
    return [
      { id: 'host-1', name: username ?? 'You', isHost: true, isReady: true },
      { id: 'p-2', name: 'Marco', isHost: false, isReady: false },
      { id: 'p-3', name: 'Elena', isHost: false, isReady: true },
    ]
  }, [wsMembers, restMembers, username])

  // When the token appears (after create/join API call or page refresh),
  // bump this counter so useRealtimeKit re-runs its effect.
  const [tokenReady, setTokenReady] = useState(0)
  const tokenKey = `room_${roomCode}_ptoken`

  // On mount: try to obtain a participant token for video.
  // 1. Check localStorage (survives refresh)
  // 2. Try GET /credentials/ (works for existing room members)
  // 3. Fall back to POST /join/ (works if not yet a member)
  useEffect(() => {
    if (!accessToken || !roomCode || roomCode === '----') return
    if (localStorage.getItem(tokenKey)) {
      setTokenReady(1)
      return
    }
    // Wait for WS to connect and add us as a member before trying REST
    if (!roomSocket.isConnected) return
    const getToken = async () => {
      try {
        const creds = await api.getCredentials(roomCode, accessToken)
        localStorage.setItem(`room_${roomCode}_pid`, creds.participant_id)
        localStorage.setItem(tokenKey, creds.token)
        setTokenReady((n) => n + 1)
      } catch {
        try {
          const res = await api.joinRoom(roomCode, accessToken)
          if (res.participant_id && res.token) {
            localStorage.setItem(`room_${roomCode}_pid`, res.participant_id)
            localStorage.setItem(tokenKey, res.token)
            setTokenReady((n) => n + 1)
          }
        } catch { /* retry later */ }
      }
    }
    getToken()
  }, [roomCode, accessToken, tokenKey, roomSocket.isConnected])

  // RealtimeKit video/audio — re-runs when token becomes available
  const rt = useRealtimeKit(roomCode, tokenReady > 0 ? tokenReady : undefined)

  // Map RealtimeKit participants to video tracks.
  const trackByName = useMemo(() => {
    const map = new Map<string, MediaStreamTrack>()
    if (!rt.isJoined) return map
    console.log('[trackByName] RTK participants:', Array.from(rt.participants.entries()).map(([id, p]) => ({ id, name: p.name, hasVideo: !!p.videoTrack, isLocal: p.isLocal })))
    console.log('[trackByName] Player names:', rawPlayers.map(p => p.name))
    for (const [, p] of rt.participants) {
      if (p.videoTrack) {
        // Index by exact name, lowercase, and also by isLocal flag
        map.set(p.name, p.videoTrack)
        map.set(p.name.trim().toLowerCase(), p.videoTrack)
        if (p.isLocal && rawPlayers.length > 0) {
          map.set(rawPlayers[0].name, p.videoTrack)
        }
      }
    }
    console.log('[trackByName] Final map keys:', Array.from(map.keys()))
    return map
  }, [rt.isJoined, rt.participants, rt.localParticipant, rawPlayers])

  // Determine if current user is host by matching our username against the WS member list
  const isHost = useMemo(() => {
    if (roomSocket.hostUsername && username && roomSocket.hostUsername === username) return true
    if (roomSocket.members.length === 0 && !restMembers) return rawPlayers[0]?.isHost ?? false
    return false
  }, [roomSocket.hostUsername, username, roomSocket.members.length, restMembers, rawPlayers])
  // Which player in the list is us (for self-indicator)
  const myName = username
  const currentPlayer = rawPlayers[0]
  const playerCount = roomSocket.memberCount || restMembers?.member_count || rawPlayers.length
  const maxMembers = roomSocket.maxMembers || restMembers?.max_members || 8
  const MIN_PLAYERS = 5
  const thresholdMet = playerCount >= MIN_PLAYERS

  const gridCols = useMemo(() => {
    const c = rawPlayers.length
    if (c <= 2) return 'grid-cols-2'; if (c <= 6) return 'grid-cols-3'; return 'grid-cols-4'
  }, [rawPlayers.length])

  // Navigate when game starts
  useEffect(() => {
    if (roomSocket.sessionId) {
      navigate({ to: '/game/$sessionId', params: { sessionId: String(roomSocket.sessionId) } })
    }
  }, [roomSocket.sessionId, navigate])

  // Join requests (host only)
  const [joinReqs, setJoinReqs] = useState<{ id: number; user_id: number; username: string; requested_at?: string }[]>([])
  const [joinReqsLoading, setJoinReqsLoading] = useState(false)

  const fetchJoinRequests = useCallback(async () => {
    if (!accessToken || !roomCode || roomCode === '----') return
    try {
      const rest = await api.getJoinRequests(roomCode, accessToken)
      setJoinReqs(rest.results)
    } catch { /* only host can see these — 403 means we're not host */ }
  }, [accessToken, roomCode])

  // Fetch join requests on connect and poll every 5s for host ONLY
  useEffect(() => {
    if (!roomSocket.isConnected || !isHost) return
    fetchJoinRequests()
    const interval = setInterval(fetchJoinRequests, 5000)
    return () => clearInterval(interval)
  }, [roomSocket.isConnected, isHost, fetchJoinRequests])

  // Merge WS join_request_received events and trigger REST refresh
  useEffect(() => {
    if (roomSocket.joinRequests.length > 0) {
      fetchJoinRequests()  // refresh the full list from REST
    }
  }, [roomSocket.joinRequests, fetchJoinRequests])

  const handleAccept = async (requestId: number) => {
    if (!accessToken || !roomCode) return
    try {
      await api.acceptJoinRequest(roomCode, requestId, accessToken)
      setJoinReqs(prev => prev.filter(r => r.id !== requestId))
      fetchMembers() // refresh member list
    } catch { /* */ }
  }

  const handleReject = async (requestId: number) => {
    if (!accessToken || !roomCode) return
    try {
      await api.rejectJoinRequest(roomCode, requestId, accessToken)
      setJoinReqs(prev => prev.filter(r => r.id !== requestId))
    } catch { /* */ }
  }

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
          {rt.isJoined && <Radio size={13} className="text-emerald-400/70" title="Video connected" />}
          {fetchError && <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400/80">REST offline</span>}
          {rt.error && <span className="rounded-full bg-[var(--color-accent-crimson)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent-crimson)]">Video: {rt.error}</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Mic */}
          <button onClick={rt.toggleMute}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${rt.isMuted ? 'bg-[var(--color-accent-crimson)]/15 text-[var(--color-accent-crimson)]' : 'bg-[var(--color-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            {rt.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            {rt.isMuted ? 'Muted' : 'Mic'}
          </button>
          {/* Camera */}
          <button onClick={rt.toggleCamera}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${rt.isCameraOff ? 'bg-[var(--color-accent-crimson)]/15 text-[var(--color-accent-crimson)]' : 'bg-[var(--color-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            {rt.isCameraOff ? <VideoOff size={14} /> : <Video size={14} />}
            {rt.isCameraOff ? 'Off' : 'Cam'}
          </button>
          <UserMenu />
          <button onClick={handleLeave} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"><ArrowLeft size={13} />Back</button>
        </div>
      </header>

      {/* Guest waiting for approval — no members yet, WS not connected */}
      {!isHost && wsMembers.length === 0 && !roomSocket.isConnected && (
        <div className="mx-6 mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-5 py-4 text-center">
          <p className="text-sm font-medium text-amber-400/90">Waiting for host approval</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
            Your request has been sent. Once the host accepts, you&rsquo;ll join the room automatically.
          </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
              <span className="text-[10px] text-amber-400/70">Checking for approval…</span>
            </div>
        </div>
      )}
      {/* Generic error banner for other issues */}
      {!isHost && wsMembers.length === 0 && roomSocket.error && roomSocket.error !== 'Join via invite code first' && !roomSocket.isConnected && (
        <div className="mx-6 mt-4 rounded-xl border border-[var(--color-accent-crimson)]/20 bg-[var(--color-accent-crimson)]/5 px-5 py-4 text-center">
          <p className="text-sm font-medium text-[var(--color-accent-crimson)]">{roomSocket.error}</p>
        </div>
      )}

      <main className="flex flex-1 items-stretch overflow-hidden">
        <div className="flex w-full flex-col gap-0 lg:flex-row">
          <section className="flex flex-1 flex-col border-b border-[var(--border-subtle)] lg:border-b-0 lg:border-r lg:border-[var(--border-subtle)] overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-6 py-4">
              <Users size={15} className="text-[var(--text-muted)]" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Pre-Game Lobby</h3>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors duration-300 ${thresholdMet ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[var(--bg-raised)] text-[var(--text-muted)]'}`}>{playerCount} / {maxMembers}</span>
              {!thresholdMet && <span className="rounded-full bg-amber-400/8 px-2 py-0.5 text-[10px] font-medium text-amber-400/80">Need {MIN_PLAYERS}+</span>}
            </div>
            <div className={`grid flex-1 gap-3 p-4 ${gridCols} auto-rows-fr content-center overflow-y-auto`}>
              {rawPlayers.map((p) => (
                <WaitingCard key={p.id} name={p.name} isHost={p.isHost} isSelf={myName ? p.name === myName : p.id === rawPlayers[0]?.id} isReady={p.isReady} isMuted={myName ? p.name !== myName : p.id !== rawPlayers[0]?.id} videoTrack={trackByName.get(p.name) ?? null} trackLabel={p.name} />
              ))}
              {rawPlayers.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-[var(--text-muted)]">Waiting for players to join…</p>
                  <p className="text-xs text-[var(--text-muted)]/60">Share the room code to invite friends.</p>
                </div>
              )}
            </div>
          </section>

          <section className="flex w-full flex-col gap-6 lg:w-[360px] lg:shrink-0 p-6">
            {/* Join requests — host only */}
            {isHost && joinReqs.length > 0 && (
              <div className="rounded-2xl border border-amber-400/20 bg-[var(--color-surface)]/40 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-400/90">Join Requests ({joinReqs.length})</h4>
                </div>
                <div className="flex flex-col gap-2">
                  {joinReqs.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3 py-2">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{r.username}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleAccept(r.id)}
                          className="rounded-lg bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-400 transition-colors hover:bg-emerald-400/25">
                          Accept
                        </button>
                        <button onClick={() => handleReject(r.id)}
                          className="rounded-lg bg-[var(--color-accent-crimson)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-accent-crimson)] transition-colors hover:bg-[var(--color-accent-crimson)]/25">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <span className="relative inline-flex items-center gap-2.5"><Play size={18} />{thresholdMet ? 'Start Game' : `Waiting for ${MIN_PLAYERS - playerCount} more`}</span>
                </button>
              ) : (
                <button onClick={() => toggleReady(currentPlayer?.id ?? '')}
                  className={`group relative w-full overflow-hidden rounded-2xl border py-5 text-sm font-bold uppercase tracking-[0.15em] transition-all duration-300 ${currentPlayer?.isReady ? 'border-[var(--border-hover)] bg-[var(--bg-raised)] text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] cursor-pointer' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 shadow-lg shadow-emerald-400/10 hover:shadow-xl hover:shadow-emerald-400/15 hover:scale-[1.01] cursor-pointer'} active:scale-[0.98]`}>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative inline-flex items-center gap-2.5"><Check size={18} />{currentPlayer?.isReady ? 'Unready' : 'Ready Up'}</span>
                </button>
              )}
            </div>
            <p className="text-center text-[11px] leading-relaxed text-[var(--text-muted)]">{isHost ? (thresholdMet ? 'Everyone is here. Start the match.' : `Need at least ${MIN_PLAYERS} players.`) : (currentPlayer?.isReady ? 'Waiting for host to start.' : 'Tap Ready Up to confirm.')}</p>
          </section>
        </div>
      </main>
    </div>
  )
}
