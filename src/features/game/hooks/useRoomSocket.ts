import { useState, useEffect, useRef, useCallback } from 'react'
import type { RoomServerMessage, RoomClientMessage } from '../types'

/* ──────────────────────────────────────────────
   WebSocket hook for room lobby
   Connects to ws://.../ws/room/<code>/
   ────────────────────────────────────────────── */

const BASE = import.meta.env.VITE_WS_URL ?? 'wss://mafia.alward.dev'

export interface RoomMember {
  user_id: number
  username: string
  isHost: boolean
  isReady: boolean
}

interface RoomSocketState {
  members: RoomMember[]
  memberCount: number
  chatMessages: { user_id: number; username: string; message: string }[]
  sessionId: number | null
  isConnected: boolean
  error: string | null
}

export function useRoomSocket(roomCode: string, accessToken: string | null) {
  const [state, setState] = useState<RoomSocketState>({
    members: [],
    memberCount: 0,
    chatMessages: [],
    sessionId: null,
    isConnected: false,
    error: null,
  })

  const wsRef = useRef<WebSocket | null>(null)

  /* ── Connect ── */
  useEffect(() => {
    if (!roomCode || !accessToken) {
      setState((s) => ({ ...s, error: 'Missing room code or access token' }))
      return
    }

    const url = `${BASE}/ws/room/${roomCode}/?token=${accessToken}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setState((s) => ({ ...s, isConnected: true, error: null }))
    }

    ws.onmessage = (event) => {
      try {
        const msg: RoomServerMessage = JSON.parse(event.data as string)
        handleMessage(msg)
      } catch {
        /* ignore malformed */
      }
    }

    ws.onerror = () => {
      setState((s) => ({ ...s, error: 'WebSocket connection failed' }))
    }

    ws.onclose = (e) => {
      setState((s) => ({ ...s, isConnected: false }))
      if (e.code === 4001) {
        setState((s) => ({ ...s, error: 'Room not found' }))
      } else if (e.code === 4002) {
        setState((s) => ({ ...s, error: 'Game already in progress' }))
      }
    }

    return () => {
      ws.close()
    }
  }, [roomCode, accessToken])

  /* ── Message handler ── */
  function handleMessage(msg: RoomServerMessage) {
    switch (msg.type) {
      case 'player_joined': {
        setState((s) => {
          const exists = s.members.find((m) => m.user_id === msg.user_id)
          const members = exists
            ? s.members
            : [...s.members, { user_id: msg.user_id, username: msg.username, isHost: false, isReady: false }]
          return { ...s, members, memberCount: msg.member_count }
        })
        break
      }
      case 'player_left': {
        setState((s) => ({
          ...s,
          members: s.members.filter((m) => m.user_id !== msg.user_id),
          memberCount: msg.member_count,
        }))
        break
      }
      case 'chat': {
        setState((s) => ({
          ...s,
          chatMessages: [...s.chatMessages, { user_id: msg.user_id, username: msg.username, message: msg.message }],
        }))
        break
      }
      case 'game_started': {
        setState((s) => ({ ...s, sessionId: msg.session_id }))
        break
      }
      case 'vote_cast': {
        // Lobby voting — not commonly used, but received
        break
      }
    }
  }

  /* ── Send ── */
  const send = useCallback((message: RoomClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendChat = useCallback((text: string) => {
    send({ type: 'chat', message: text })
  }, [send])

  const startGame = useCallback(() => {
    send({ type: 'start_game' })
  }, [send])

  return {
    ...state,
    sendChat,
    startGame,
  }
}
