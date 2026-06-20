import { useEffect, useRef } from 'react'
import type { GamePlayer, ServerPhase, ActionType } from '../types'
import { MicOff, Crosshair, Shield as ShieldIcon, Eye, User } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import ActionOverlay from './ActionOverlay'
import { roleLabel } from '../types'

const ROLE_ACCENT: Record<GamePlayer['role'], string> = {
  mafia: 'text-[var(--color-accent-crimson)]', detective: 'text-[var(--color-accent-slate)]',
  doctor: 'text-emerald-400', villager: 'text-[var(--text-muted)]',
}
const ROLE_ICON: Partial<Record<GamePlayer['role'], typeof Eye>> = {
  detective: Eye, doctor: ShieldIcon, villager: User,
}

function Silhouette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-10 w-10 text-zinc-700">
      <circle cx="12" cy="9" r="4" /><path d="M5 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

/** Renders a video element for the given track, auto-plays and mirrors local video */
function VideoFeed({ track, muted }: { track: MediaStreamTrack; muted: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const stream = new MediaStream([track])
    el.srcObject = stream
    return () => { el.srcObject = null }
  }, [track])
  return <video ref={ref} autoPlay playsInline muted={muted} className="absolute inset-0 h-full w-full object-cover" />
}

interface PlayerCardProps {
  player: GamePlayer
  showTargeted?: boolean
  localPlayer?: GamePlayer
  localRole?: GamePlayer['role'] | null
  currentPhase?: ServerPhase
  onAction?: (targetId: string, action: ActionType) => void
  /** Real video track from RealtimeKit */
  videoTrack?: MediaStreamTrack | null
}

export default function PlayerCard({ player, showTargeted = false, localPlayer, localRole, currentPhase = 'day', onAction, videoTrack }: PlayerCardProps) {
  const { id, name, role, team, isAlive, isMuted, isSpeaking, voteCount, hasVoted, isTargeted, isHost, isProtected, isSilenced } = player
  const accent = ROLE_ACCENT[role]
  const SelfIcon = ROLE_ICON[role]
  const isSelf = localPlayer ? id === localPlayer.id : false
  const showMafiaStripe = localPlayer && localPlayer.team === 'mafia' && team === 'mafia' && isAlive
  const showTeammateTint = showMafiaStripe && !isSelf
  const showProtected = isProtected && isAlive
  const showSilenced = isSilenced && isAlive && currentPhase === 'day'
  const showTargetedBorder = showTargeted && isTargeted && isAlive
  const hasVideo = !!videoTrack && isAlive

  const borderClass = isSpeaking
    ? 'border-[var(--color-accent-slate)]/60 shadow-[0_0_20px_rgba(63,81,181,0.15)]'
    : showProtected ? 'border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
    : showTargetedBorder ? 'border-[var(--color-accent-crimson)]/50 shadow-[0_0_12px_rgba(239,68,68,0.12)] animate-pulse'
    : 'border-[var(--border-dim)] hover:border-[var(--border-hover)]'

  return (
    <motion.div layout
      className={`group relative flex aspect-[4/3] flex-col overflow-hidden rounded-2xl transition-colors duration-500 ${borderClass}`}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      {showMafiaStripe && <div className="pointer-events-none absolute bottom-2 left-0 top-2 z-20 w-[3px] rounded-r-full bg-[var(--color-accent-crimson)]/45" />}
      <AnimatePresence>
        {showProtected && (
          <motion.div className="pointer-events-none absolute left-3 top-3 z-20" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.3 }}>
            <ShieldIcon size={14} className="text-emerald-400/80 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`relative flex flex-1 items-center justify-center bg-[#18181B] ${!isAlive ? 'pointer-events-none' : ''}`}>
        {/* Real video or silhouette */}
        {hasVideo ? (
          <VideoFeed track={videoTrack!} muted={isSelf} />
        ) : (
          <>{!isAlive ? null : <Silhouette />}</>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {isAlive && onAction && (
          <ActionOverlay player={player} isSelf={isSelf} currentPhase={currentPhase} localRole={localRole ?? null} onAction={onAction} />
        )}

        {!isAlive && (
          <span className="relative z-10 font-mono text-sm font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Signal Lost</span>
        )}

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`truncate text-xs font-semibold ${showTeammateTint ? 'text-[var(--color-accent-crimson)]/85' : 'text-[var(--text-primary)]'}`}>{name}</span>
            {isSelf && SelfIcon && role !== 'mafia' && <SelfIcon size={12} className={`shrink-0 ${accent}`} />}
            {isHost && <span className="shrink-0 rounded-md border border-[var(--color-accent-slate)]/25 bg-[var(--color-accent-slate)]/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent-slate)]">Host</span>}
          </div>
          {isMuted && <MicOff size={13} className="shrink-0 text-[var(--text-muted)]" />}
        </div>
      </div>

      <AnimatePresence>
        {showSilenced && (
          <motion.div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-2 bg-orange-400/90 py-1.5" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <MicOff size={12} className="text-black" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black">Silenced</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!isAlive && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--color-background)]/80 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <span className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Signal Lost</span>
            <span className="rounded-full border border-[var(--border-dim)] bg-[var(--bg-raised)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">{roleLabel(role)} — Eliminated</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {hasVoted && isAlive && (
          <motion.div className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-lg border border-[var(--color-accent-slate)]/20 bg-[var(--color-accent-slate)]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent-slate)] backdrop-blur-sm" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.2 }}><Crosshair size={11} />Voted</motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {voteCount > 0 && isAlive && (
          <motion.div className="absolute bottom-12 right-2.5 z-10 inline-flex items-center gap-1 rounded-lg border border-[var(--color-accent-crimson)]/20 bg-[var(--color-accent-crimson)]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent-crimson)] backdrop-blur-sm" key={`votes-${voteCount}`} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}><span className="text-xs font-bold">&#10005;</span>{voteCount}</motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
