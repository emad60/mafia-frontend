import { useState, useEffect, useRef, useCallback } from 'react'
import type { GamePlayer, GameRole, ServerPhase, GameServerMessage, GameClientMessage } from '../types'
import { teamFromRole } from '../types'

const BASE = import.meta.env.VITE_WS_URL ?? 'wss://mafia.alward.dev'

interface GameSocketState {
  players: GamePlayer[]
  phase: ServerPhase
  roundNumber: number
  winner: string | null
  localRole: GameRole | null
  isConnected: boolean
  error: string | null
}

export function useGameSocket(sessionId: string, accessToken: string | null) {
  const [state, setState] = useState<GameSocketState>({
    players: [], phase: 'night', roundNumber: 1,
    winner: null, localRole: null, isConnected: false, error: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const playerMapRef = useRef<Map<string, GamePlayer>>(new Map())
  const activeUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!sessionId || !accessToken) {
      setState((s) => ({ ...s, error: 'Missing session ID or access token' }))
      return
    }

    const url = `${BASE}/ws/game/${sessionId}/?token=${accessToken}`

    // Reuse existing connection (StrictMode remount)
    if (activeUrlRef.current === url && wsRef.current?.readyState === WebSocket.OPEN) {
      setState((s) => ({ ...s, isConnected: true, error: null }))
      return
    }

    // URL changed — close old
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    activeUrlRef.current = url
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setState((s) => ({ ...s, isConnected: true, error: null }))

    ws.onmessage = (event) => {
      try {
        const msg: GameServerMessage = JSON.parse(event.data as string)
        handleMessage(msg)
      } catch { /* ignore */ }
    }

    ws.onerror = () => {
      if (activeUrlRef.current !== url) return
      if (wsRef.current?.readyState === WebSocket.OPEN) return
      setState((s) => ({ ...s, error: 'WebSocket connection failed' }))
    }

    ws.onclose = (e) => {
      if (activeUrlRef.current !== url) return
      setState((s) => ({ ...s, isConnected: false }))
      if (e.code === 4001) setState((s) => ({ ...s, error: 'You are dead or the session does not exist' }))
    }

    // No cleanup — connection persists across StrictMode remounts
  }, [sessionId, accessToken])

  function handleMessage(msg: GameServerMessage) {
    switch (msg.type) {
      case 'your_role': {
        const role = msg.role
        setState((s) => ({ ...s, localRole: role }))
        const self: GamePlayer = {
          id: 'local', name: 'You', role, team: teamFromRole(role),
          isAlive: true, isMuted: false, isSpeaking: false,
          voteCount: 0, hasVoted: false, isTargeted: false,
          isHost: false, isProtected: false, isSilenced: false,
        }
        playerMapRef.current.set('local', self)
        syncPlayers()
        break
      }
      case 'phase_changed': {
        setState((s) => ({ ...s, phase: msg.phase, roundNumber: msg.round_number }))
        playerMapRef.current.forEach((p) => { p.hasVoted = false; p.voteCount = 0; p.isProtected = false; p.isSilenced = false })
        syncPlayers()
        break
      }
      case 'player_killed': {
        const p = playerMapRef.current.get(String(msg.user_id))
        if (p) { p.isAlive = false; syncPlayers() }
        break
      }
      case 'vote_cast': {
        const target = playerMapRef.current.get(String(msg.target_id))
        if (target) { target.voteCount += 1; syncPlayers() }
        break
      }
      case 'game_over': {
        setState((s) => ({ ...s, winner: msg.winner, phase: 'ended' as ServerPhase }))
        break
      }
      default: break
    }
  }

  function syncPlayers() {
    setState((s) => ({ ...s, players: Array.from(playerMapRef.current.values()) }))
  }

  const send = useCallback((message: GameClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const registerPlayers = useCallback((roster: { id: string; name: string }[]) => {
    roster.forEach((r) => {
      if (!playerMapRef.current.has(r.id) && r.id !== 'local') {
        playerMapRef.current.set(r.id, {
          id: r.id, name: r.name, role: 'villager', team: 'innocent',
          isAlive: true, isMuted: false, isSpeaking: false,
          voteCount: 0, hasVoted: false, isTargeted: false,
          isHost: false, isProtected: false, isSilenced: false,
        })
      }
    })
    syncPlayers()
  }, [])

  return { ...state, send, registerPlayers }
}
