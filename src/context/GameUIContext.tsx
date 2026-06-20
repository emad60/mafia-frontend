import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { api, type TokenResponse } from '../lib/api'

/* ── Game phases (only relevant in-game) ── */
export type GamePhase = 'night' | 'day' | 'voting' | 'results'

/* ── Role-card reveal state ── */
export type RoleAssignment = 'pending' | 'revealed' | 'hidden'

/* ── Auth modal mode ── */
export type AuthMode = 'signin' | 'signup'

/* ── Theme ── */
export type Theme = 'dark' | 'light'

/* ── Player entry (lightweight, for lobby roster) ── */
export interface Player {
  id: string
  name: string
  isReady: boolean
  isHost: boolean
}

/* ── Match integrity settings ── */
export interface MatchSettings {
  anonymousVoting: boolean
  dayTimer: string
  nightTimer: string
}

/* ── Minimum players required ── */
export const MIN_PLAYERS = 5

/* ── Readable room-code charset ── */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

/* ── Pre-seeded demo names ── */
const DEMO_NAMES = ['Marco', 'Elena', 'Lucas', 'Sofia', 'Kai', 'Priya', 'Omar']

function buildDemoPlayers(hostName: string, count: number): Player[] {
  const host: Player = { id: 'host-1', name: hostName, isReady: true, isHost: true }
  const guests: Player[] = DEMO_NAMES.slice(0, count).map((name, i) => ({
    id: `p-${i + 2}`,
    name,
    isReady: Math.random() > 0.5,
    isHost: false,
  }))
  return [host, ...guests]
}

/* ── Shape of the context ── */
interface GameUIState {
  /* theme */
  theme: Theme

  /* auth */
  isAuthenticated: boolean
  authModalOpen: boolean
  authModalMode: AuthMode
  accessToken: string | null
  refreshToken: string | null
  username: string | null

  /* game */
  currentPhase: GamePhase
  roleAssignment: RoleAssignment
  isTransitioning: boolean

  /* media */
  isMuted: boolean
  isCameraOn: boolean

  /* lobby */
  players: Player[]
  roomCode: string
  matchSettings: MatchSettings
}

interface GameUIContextValue extends GameUIState {
  /* theme */
  toggleTheme: () => void

  /* game */
  setPhase: (phase: GamePhase) => void
  setRoleAssignment: (state: RoleAssignment) => void

  /* lobby flow */
  createRoom: () => string
  joinRoom: (code: string) => void
  startGame: () => string

  /* auth */
  openAuthModal: (mode?: AuthMode) => void
  closeAuthModal: () => void
  /** Login with backend — returns token response */
  login: (username: string, password: string) => Promise<TokenResponse>
  /** Login with stored tokens (Google SSO mock / rehydration) */
  setTokens: (access: string, refresh: string, username: string) => void
  logout: () => void

  /* media */
  toggleMute: () => void
  toggleCamera: () => void

  /* lobby roster */
  toggleReady: (playerId: string) => void
  addPlayer: (name: string) => void
  removePlayer: (playerId: string) => void
}

/* ── Defaults ── */
const DEFAULT_STATE: GameUIState = {
  theme: 'dark',

  isAuthenticated: false,
  authModalOpen: false,
  authModalMode: 'signin',
  accessToken: null,
  refreshToken: null,
  username: null,

  currentPhase: 'night',
  roleAssignment: 'pending',
  isTransitioning: false,

  isMuted: false,
  isCameraOn: false,

  players: [],
  roomCode: '----',
  matchSettings: {
    anonymousVoting: true,
    dayTimer: '3m',
    nightTimer: '1m',
  },
}

const GameUIContext = createContext<GameUIContextValue | null>(null)

/* ── Provider ── */
export function GameUIProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameUIState>(DEFAULT_STATE)

  /* ── Theme ── */
  const toggleTheme = useCallback(() => {
    setState((prev) => {
      const next: Theme = prev.theme === 'dark' ? 'light' : 'dark'
      return { ...prev, theme: next }
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  /* ── Game ── */
  const setPhase = useCallback((phase: GamePhase) => {
    if (phase === state.currentPhase) return
    setState((prev) => ({ ...prev, isTransitioning: true }))
    setTimeout(() => {
      setState((prev) => ({ ...prev, currentPhase: phase, isTransitioning: false }))
    }, 350)
  }, [state.currentPhase])

  const setRoleAssignment = useCallback((role: RoleAssignment) => {
    setState((prev) => ({ ...prev, roleAssignment: role }))
  }, [])

  /* ── Lobby flow ── */
  const createRoom = useCallback((): string => {
    const code = generateRoomCode()
    const players = buildDemoPlayers('You', 3)
    setState((prev) => ({ ...prev, roomCode: code, players }))
    return code
  }, [])

  const joinRoom = useCallback((code: string) => {
    const roster: Player[] = [
      { id: 'host-0', name: 'Alex', isReady: true, isHost: true },
      { id: 'p-joined', name: 'You', isReady: false, isHost: false },
      ...DEMO_NAMES.slice(0, 3).map((name, i) => ({
        id: `p-${i + 5}`,
        name,
        isReady: Math.random() > 0.5,
        isHost: false,
      })),
    ]
    setState((prev) => ({ ...prev, roomCode: code.toUpperCase(), players: roster }))
  }, [])

  const startGame = useCallback((): string => {
    const sessionId = generateRoomCode() + generateRoomCode()
    setState((prev) => ({ ...prev, currentPhase: 'night', isTransitioning: true }))
    setTimeout(() => {
      setState((prev) => ({ ...prev, isTransitioning: false }))
    }, 350)
    return sessionId
  }, [])

  /* ── Auth ── */
  const openAuthModal = useCallback((mode: AuthMode = 'signin') => {
    setState((prev) => ({ ...prev, authModalOpen: true, authModalMode: mode }))
  }, [])

  const closeAuthModal = useCallback(() => {
    setState((prev) => ({ ...prev, authModalOpen: false }))
  }, [])

  /** Real backend login */
  const login = useCallback(async (username: string, password: string): Promise<TokenResponse> => {
    const tokens = await api.login(username, password)
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      authModalOpen: false,
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      username,
    }))
    return tokens
  }, [])

  /** Set tokens directly (Google SSO mock / rehydration) */
  const setTokens = useCallback((access: string, refresh: string, username: string) => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      authModalOpen: false,
      accessToken: access,
      refreshToken: refresh,
      username,
    }))
  }, [])

  const logout = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      username: null,
      players: [],
      roomCode: '----',
    }))
  }, [])

  /* ── Media ── */
  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
  }, [])

  const toggleCamera = useCallback(() => {
    setState((prev) => ({ ...prev, isCameraOn: !prev.isCameraOn }))
  }, [])

  /* ── Lobby roster ── */
  const toggleReady = useCallback((playerId: string) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, isReady: !p.isReady } : p
      ),
    }))
  }, [])

  const addPlayer = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      players: [...prev.players, { id: `p-${Date.now()}`, name, isReady: false, isHost: false }],
    }))
  }, [])

  const removePlayer = useCallback((playerId: string) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }))
  }, [])

  return (
    <GameUIContext.Provider
      value={{
        ...state,
        toggleTheme,
        setPhase,
        setRoleAssignment,
        createRoom,
        joinRoom,
        startGame,
        openAuthModal,
        closeAuthModal,
        login,
        setTokens,
        logout,
        toggleMute,
        toggleCamera,
        toggleReady,
        addPlayer,
        removePlayer,
      }}
    >
      {children}
    </GameUIContext.Provider>
  )
}

/* ── Hook ── */
export function useGameUI() {
  const ctx = useContext(GameUIContext)
  if (!ctx) {
    throw new Error('useGameUI must be used within a <GameUIProvider>')
  }
  return ctx
}
