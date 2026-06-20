import { useState } from 'react'
import type { GamePlayer, ActionType, ServerPhase } from '../types'
import { Eye, Shield, Crosshair, Target } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

interface ActionConfig { icon: typeof Eye; label: string; colorClass: string }

const ACTION_CONFIG: Record<ActionType, ActionConfig> = {
  vote:                  { icon: Target,    label: 'ACCUSE',     colorClass: 'border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20' },
  detective_investigate: { icon: Eye,       label: 'INVESTIGATE', colorClass: 'border-[var(--color-accent-slate)]/40 bg-[var(--color-accent-slate)]/10 text-[var(--color-accent-slate)] hover:bg-[var(--color-accent-slate)]/20' },
  doctor_protect:        { icon: Shield,    label: 'PROTECT',     colorClass: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20' },
  mafia_kill:            { icon: Crosshair, label: 'ELIMINATE',   colorClass: 'border-[var(--color-accent-crimson)]/40 bg-[var(--color-accent-crimson)]/10 text-[var(--color-accent-crimson)] hover:bg-[var(--color-accent-crimson)]/20' },
}

function getAvailableAction(isSelf: boolean, isAlive: boolean, currentPhase: ServerPhase, localRole: GamePlayer['role'] | null): ActionType | null {
  if (!isAlive || isSelf) return null
  if (!localRole) return null
  if (currentPhase === 'voting') return 'vote'
  if (currentPhase === 'night') {
    if (localRole === 'detective') return 'detective_investigate'
    if (localRole === 'doctor') return 'doctor_protect'
    if (localRole === 'mafia') return 'mafia_kill'
  }
  return null
}

interface ActionOverlayProps {
  player: GamePlayer
  isSelf: boolean
  currentPhase: ServerPhase
  localRole: GamePlayer['role'] | null
  onAction: (targetId: string, action: ActionType) => void
}

export default function ActionOverlay({ player, isSelf, currentPhase, localRole, onAction }: ActionOverlayProps) {
  const [investigated, setInvestigated] = useState<'mafia' | 'innocent' | null>(null)
  const [nightActionUsed, setNightActionUsed] = useState(false)

  const action = getAvailableAction(isSelf, player.isAlive, currentPhase, localRole)
  if (!action) return null
  if (currentPhase === 'night' && nightActionUsed) return null

  const config = ACTION_CONFIG[action]
  const Icon = config.icon

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (action === 'detective_investigate') {
      setInvestigated(player.team === 'mafia' ? 'mafia' : 'innocent')
      onAction(player.id, action)
      return
    }
    onAction(player.id, action)
    if (currentPhase === 'night') setNightActionUsed(true)
  }

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/50"
      initial={{ opacity: 0 }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] backdrop-blur-sm ${config.colorClass}`}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <Icon size={14} />
        {config.label}
      </motion.button>

      <AnimatePresence>
        {investigated && (
          <motion.span
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] backdrop-blur-sm ${
              investigated === 'mafia'
                ? 'border-[var(--color-accent-crimson)]/30 bg-[var(--color-accent-crimson)]/15 text-[var(--color-accent-crimson)]'
                : 'border-emerald-400/30 bg-emerald-400/15 text-emerald-400'
            }`}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            ALIGNED: {investigated === 'mafia' ? 'MAFIA' : 'INNOCENT'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
