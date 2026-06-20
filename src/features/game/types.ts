/* ──────────────────────────────────────────────
   Core game types — aligned with Django backend
   ────────────────────────────────────────────── */

/** Matches backend Role enum in apps/game/__init__.py */
export type GameRole = 'villager' | 'mafia' | 'doctor' | 'detective'

/** Team alignment derived from role */
export type Team = 'innocent' | 'mafia'

/** Backend-aligned action types (WebSocket event names) */
export type ActionType = 'mafia_kill' | 'detective_investigate' | 'doctor_protect' | 'vote'

/** Backend-aligned phase names */
export type ServerPhase = 'night' | 'day' | 'voting' | 'ended'

/** Live player snapshot synced from WebSocket */
export interface GamePlayer {
  id: string
  name: string
  role: GameRole
  team: Team
  isAlive: boolean
  isMuted: boolean
  isSpeaking: boolean
  voteCount: number
  hasVoted: boolean
  isTargeted: boolean
  isHost: boolean
  isProtected: boolean
  isSilenced: boolean
}

/** Payload sent from server on connect */
export interface YourRolePayload {
  type: 'your_role'
  role: GameRole
}

/** Payload for phase change broadcast */
export interface PhaseChangedPayload {
  type: 'phase_changed'
  phase: ServerPhase
  round_number: number
}

/** Payload for player killed broadcast */
export interface PlayerKilledPayload {
  type: 'player_killed'
  user_id: number
}

/** Payload for vote cast broadcast */
export interface VoteCastPayload {
  type: 'vote_cast'
  user_id: number
  username: string
  target_id: number
}

/** Payload for detective investigation result (private) */
export interface InvestigationResultPayload {
  type: 'investigation_result'
  target_id: number
  is_mafia: boolean
}

/** Payload for game over broadcast */
export interface GameOverPayload {
  type: 'game_over'
  winner: 'mafia' | 'villagers'
}

/** Union of all server→client game messages */
export type GameServerMessage =
  | YourRolePayload
  | PhaseChangedPayload
  | PlayerKilledPayload
  | VoteCastPayload
  | InvestigationResultPayload
  | GameOverPayload

/** Union of all client→server game messages */
export type GameClientMessage =
  | { type: 'mafia_kill'; target_id: number }
  | { type: 'detective_investigate'; target_id: number }
  | { type: 'doctor_protect'; target_id: number }
  | { type: 'vote'; target_id: number }
  | { type: 'next_phase' }

/* ── Room lobby WebSocket types ── */

export interface RoomPlayerJoinedPayload {
  type: 'player_joined'
  user_id: number
  username: string
  member_count: number
}

export interface RoomPlayerLeftPayload {
  type: 'player_left'
  user_id: number
  username: string
  member_count: number
}

export interface RoomChatPayload {
  type: 'chat'
  user_id: number
  username: string
  message: string
}

export interface RoomGameStartedPayload {
  type: 'game_started'
  session_id: number
  host: string
}

export interface RoomVoteCastPayload {
  type: 'vote_cast'
  user_id: number
  username: string
  target_id: number
}

export type RoomServerMessage =
  | RoomPlayerJoinedPayload
  | RoomPlayerLeftPayload
  | RoomChatPayload
  | RoomGameStartedPayload
  | RoomVoteCastPayload

export type RoomClientMessage =
  | { type: 'chat'; message: string }
  | { type: 'start_game' }
  | { type: 'vote'; target_id: number }

/** Helper: derive team from role */
export function teamFromRole(role: GameRole): Team {
  return role === 'mafia' ? 'mafia' : 'innocent'
}

/** Helper: derive display label from role */
export function roleLabel(role: GameRole): string {
  switch (role) {
    case 'mafia':     return 'MAFIA'
    case 'detective': return 'DETECTIVE'
    case 'doctor':    return 'DOCTOR'
    case 'villager':  return 'VILLAGER'
  }
}

export const LOCAL_PLAYER_ID = 'p-1'
