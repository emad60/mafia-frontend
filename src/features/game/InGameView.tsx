import { useGameUI, type GamePhase } from '../../context/GameUIContext'
import { ThemeToggle, UserMenu } from '../../components'
import GameSessionView from './components/GameSessionView'
import { Moon, Sun, Vote, Trophy, Mic, MicOff, Video, VideoOff } from 'lucide-react'

/* ──────────────────────────────────────────────
   Phase metadata for the debug dropdown
   ────────────────────────────────────────────── */
const PHASE_META: Record<GamePhase, { icon: typeof Moon; label: string }> = {
  night:   { icon: Moon,   label: 'Night'   },
  day:     { icon: Sun,    label: 'Day'     },
  voting:  { icon: Vote,   label: 'Voting'  },
  results: { icon: Trophy, label: 'Results' },
}

/* ──────────────────────────────────────────────
   In-game header — MAFIA + phase debug + media + theme
   ────────────────────────────────────────────── */
function InGameHeader() {
  const { currentPhase, setPhase, isTransitioning, isMuted, isCameraOn, toggleMute, toggleCamera, theme } = useGameUI()
  const phases: GamePhase[] = ['night', 'day', 'voting', 'results']

  return (
    <header
      className="
        fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between
        border-b border-[var(--border-subtle)]
        bg-[var(--color-background)]/80 backdrop-blur-md
        px-6
      "
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-[0.3em] text-[var(--text-primary)]">
          MAFIA
        </span>
        <span className="hidden h-4 w-px bg-[var(--border-dim)] sm:block" />
        <select
          value={currentPhase}
          disabled={isTransitioning}
          onChange={(e) => setPhase(e.target.value as GamePhase)}
          className="
            appearance-none rounded-lg border border-[var(--border-dim)]
            bg-[var(--color-surface)] px-3 py-1.5 pr-8
            text-xs font-medium text-[var(--text-primary)]
            outline-none transition-colors
            focus:border-[var(--color-accent-slate)]
            disabled:pointer-events-none disabled:opacity-40
          "
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23${theme === 'dark' ? '52525b' : 'a1a1aa'}' stroke-width='2'%3E%3Cpath d='m2 4 4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          {phases.map((p) => (
            <option key={p} value={p}>{PHASE_META[p].label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${isMuted ? 'bg-[var(--color-accent-crimson)]/15 text-[var(--color-accent-crimson)]' : 'bg-[var(--color-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
        >
          {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          {isMuted ? 'Muted' : 'Mic'}
        </button>
        <button
          onClick={toggleCamera}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${!isCameraOn ? 'bg-[var(--color-accent-crimson)]/15 text-[var(--color-accent-crimson)]' : 'bg-[var(--color-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
        >
          {isCameraOn ? <Video size={14} /> : <VideoOff size={14} />}
          {isCameraOn ? 'Cam' : 'Off'}
        </button>

        {/* ── Theme Toggle ── */}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}

/* ──────────────────────────────────────────────
   In-game view — header + full session layout
   ────────────────────────────────────────────── */
interface InGameViewProps {
  sessionId: string
}

export function InGameView({ sessionId }: InGameViewProps) {
  const { currentPhase, roomCode } = useGameUI()

  return (
    <div className="flex h-svh flex-col bg-[var(--color-background)]">
      <InGameHeader />
      <div className="flex-1 overflow-hidden pt-14">
        <GameSessionView currentPhase={currentPhase} sessionId={sessionId} roomCode={roomCode} />
      </div>
    </div>
  )
}
