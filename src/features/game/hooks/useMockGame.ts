import { useState, useCallback } from 'react'
import type { GamePlayer, ActionType } from '../types'
import { LOCAL_PLAYER_ID } from '../types'

/* ──────────────────────────────────────────────
   Mock game state — fallback when backend is
   unavailable. Types aligned with backend.
   ────────────────────────────────────────────── */

const INITIAL_PLAYERS: GamePlayer[] = [
  { id: 'p-1', name: 'You', role: 'mafia', team: 'mafia', isAlive: true, isMuted: false, isSpeaking: true, voteCount: 0, hasVoted: false, isTargeted: false, isHost: true, isProtected: false, isSilenced: false },
  { id: 'p-2', name: 'Marco', role: 'mafia', team: 'mafia', isAlive: true, isMuted: true, isSpeaking: false, voteCount: 0, hasVoted: false, isTargeted: false, isHost: false, isProtected: false, isSilenced: false },
  { id: 'p-3', name: 'Elena', role: 'doctor', team: 'innocent', isAlive: true, isMuted: true, isSpeaking: false, voteCount: 0, hasVoted: false, isTargeted: false, isHost: false, isProtected: false, isSilenced: false },
  { id: 'p-4', name: 'Lucas', role: 'villager', team: 'innocent', isAlive: true, isMuted: false, isSpeaking: false, voteCount: 0, hasVoted: true, isTargeted: false, isHost: false, isProtected: false, isSilenced: false },
  { id: 'p-5', name: 'Sofia', role: 'villager', team: 'innocent', isAlive: true, isMuted: true, isSpeaking: false, voteCount: 3, hasVoted: false, isTargeted: false, isHost: false, isProtected: false, isSilenced: false },
  { id: 'p-6', name: 'Kai', role: 'villager', team: 'innocent', isAlive: false, isMuted: true, isSpeaking: false, voteCount: 0, hasVoted: false, isTargeted: false, isHost: false, isProtected: false, isSilenced: false },
  { id: 'p-7', name: 'Priya', role: 'mafia', team: 'mafia', isAlive: false, isMuted: true, isSpeaking: false, voteCount: 0, hasVoted: false, isTargeted: false, isHost: false, isProtected: false, isSilenced: false },
  { id: 'p-8', name: 'Omar', role: 'villager', team: 'innocent', isAlive: true, isMuted: false, isSpeaking: false, voteCount: 0, hasVoted: false, isTargeted: true, isHost: false, isProtected: false, isSilenced: false },
]

export function useMockGame() {
  const [players, setPlayers] = useState<GamePlayer[]>(INITIAL_PLAYERS)

  const update = useCallback((id: string, fn: (p: GamePlayer) => GamePlayer) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? fn(p) : p)))
  }, [])

  const onAction = useCallback((targetId: string, action: ActionType) => {
    switch (action) {
      case 'vote': {
        update(targetId, (p) => ({ ...p, voteCount: p.voteCount + 1, hasVoted: true }))
        break
      }
      case 'detective_investigate': {
        // Handled inline by ActionOverlay local state
        break
      }
      case 'doctor_protect': {
        update(targetId, (p) => ({ ...p, isProtected: true }))
        break
      }
      case 'mafia_kill': {
        update(targetId, (p) => ({ ...p, isAlive: false }))
        break
      }
    }
    console.log(`[Mock] ${action} → ${targetId}`)
  }, [update])

  const localPlayer = players.find((p) => p.id === LOCAL_PLAYER_ID) ?? players[0]

  return { players, localPlayer, onAction, round: 2 }
}
