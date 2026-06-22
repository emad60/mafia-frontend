import { useState, useEffect, useRef, useCallback } from 'react'
import type { RoomServerMessage, RoomClientMessage } from '../types'

const BASE = import.meta.env.VITE_WS_URL ?? 'wss://mafia.alward.dev'

export interface RoomMember {
  user_id: number; username: string; isHost: boolean; isReady: boolean
}

interface RoomSocketState {
  members: RoomMember[]; memberCount: number
  chatMessages: { user_id: number; username: string; message: string }[]
  sessionId: number | null; isConnected: boolean; error: string | null
}

export function useRoomSocket(roomCode: string, accessToken: string | null) {
  const [state, setState] = useState<RoomSocketState>({
    members: [], memberCount: 0, chatMessages: [],
    sessionId: null, isConnected: false, error: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const activeUrlRef = useRef<string | null>(null)
  const instanceId = useRef(`ws-${Math.random().toString(36).slice(2, 6)}`)

  useEffect(() => {
    const iid = instanceId.current
    console.log(`[${iid}] 🔵 useEffect fired — roomCode="${roomCode}", token=${accessToken ? accessToken.slice(0, 20) + '...' : 'null'}`)

    if (!roomCode || roomCode === '----' || !accessToken) {
      console.log(`[${iid}] ⚠️ Skipping — missing roomCode or token`)
      setState((s) => ({ ...s, error: 'Missing room code or access token' }))
      return
    }

    const url = `${BASE}/ws/room/${roomCode}/?token=${accessToken}`

    // Already connected to this exact URL?
    if (activeUrlRef.current === url && wsRef.current) {
      const rs = wsRef.current.readyState
      console.log(`[${iid}] 🔁 Effect re-ran, existing WS readyState=${rs} (0=CONNECTING 1=OPEN 2=CLOSING 3=CLOSED)`)
      if (rs === WebSocket.OPEN) {
        console.log(`[${iid}] ✅ Reusing open connection`)
        setState((s) => ({ ...s, isConnected: true, error: null }))
        return
      }
      if (rs === WebSocket.CONNECTING) {
        console.log(`[${iid}] ⏳ Connection in progress, waiting...`)
        return
      }
      // CLOSING or CLOSED — fall through to create a new one
      console.log(`[${iid}] ⚠️ Existing socket is dead (CLOSING/CLOSED), creating new one`)
    }

    // Close old connection if URL changed
    if (wsRef.current) {
      console.log(`[${iid}] 🔴 Closing previous WS (URL changed)`)
      wsRef.current.close()
      wsRef.current = null
      activeUrlRef.current = null
    }

    activeUrlRef.current = url
    console.log(`[${iid}] 🟡 Creating new WebSocket: ${url.slice(0, 80)}...`)
    const ws = new WebSocket(url)
    wsRef.current = ws
    console.log(`[${iid}]   readyState after new: ${ws.readyState} (0=CONNECTING)`)

    ws.onopen = () => {
      console.log(`[${iid}] 🟢 onopen fired — connected!`)
      setState((s) => ({ ...s, isConnected: true, error: null }))
    }

    ws.onmessage = (event) => {
      console.log(`[${iid}] 📨 onmessage: ${(event.data as string).slice(0, 120)}`)
      try {
        const msg: RoomServerMessage = JSON.parse(event.data as string)
        handleMessage(msg)
      } catch { /* ignore malformed */ }
    }

    ws.onerror = (ev) => {
      console.warn(`[${iid}] 🔴 onerror fired — readyState=${ws.readyState}`, ev)
      if (activeUrlRef.current !== url) {
        console.log(`[${iid}]   (ignoring — URL changed)`)
        return
      }
      setState((s) => ({ ...s, error: 'WebSocket connection failed' }))
    }

    ws.onclose = (e) => {
      console.log(`[${iid}] 🔴 onclose — code=${e.code} reason="${e.reason}" wasClean=${e.wasClean}`)
      if (activeUrlRef.current !== url) {
        console.log(`[${iid}]   (ignoring — URL changed)`)
        return
      }
      wsRef.current = null
      setState((s) => ({ ...s, isConnected: false }))
      if (e.code === 4001) setState((s) => ({ ...s, error: 'Room not found' }))
      else if (e.code === 4002) setState((s) => ({ ...s, error: 'Game already in progress' }))
    }

    return () => {
      console.log(`[${iid}] 🧹 Cleanup function called`)
      // We intentionally do NOT close the WS here so it survives StrictMode remounts
    }
  }, [roomCode, accessToken])

  function handleMessage(msg: RoomServerMessage) {
    switch (msg.type) {
      case 'player_joined': {
        setState((s) => {
          const exists = s.members.find((m) => m.user_id === msg.user_id)
          const members = exists ? s.members : [...s.members, { user_id: msg.user_id, username: msg.username, isHost: false, isReady: false }]
          return { ...s, members, memberCount: msg.member_count }
        })
        break
      }
      case 'player_left': {
        setState((s) => ({ ...s, members: s.members.filter((m) => m.user_id !== msg.user_id), memberCount: msg.member_count }))
        break
      }
      case 'chat': {
        setState((s) => ({ ...s, chatMessages: [...s.chatMessages, { user_id: msg.user_id, username: msg.username, message: msg.message }] }))
        break
      }
      case 'game_started': {
        setState((s) => ({ ...s, sessionId: msg.session_id }))
        break
      }
      case 'vote_cast': { break }
    }
  }

  const send = useCallback((message: RoomClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendChat = useCallback((text: string) => { send({ type: 'chat', message: text }) }, [send])
  const startGame = useCallback(() => { send({ type: 'start_game' }) }, [send])

  return { ...state, sendChat, startGame }
}
