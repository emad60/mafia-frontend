import { useState, useEffect, useRef, useCallback } from 'react'
import type { RoomServerMessage, RoomClientMessage } from '../types'

const BASE = import.meta.env.VITE_WS_URL ?? 'wss://mafia.alward.dev'

export interface RoomMember { user_id: number; username: string; isHost: boolean; isReady: boolean }
export interface JoinRequest { id: number; user_id: number; username: string; requested_at?: string }

interface RoomSocketState {
  members: RoomMember[]
  memberCount: number
  roomName: string
  roomStatus: string
  hostId: number | null
  hostUsername: string
  maxMembers: number
  chatMessages: { user_id: number; username: string; message: string }[]
  joinRequests: JoinRequest[]
  sessionId: number | null
  isConnected: boolean
  error: string | null
}

export function useRoomSocket(roomCode: string, accessToken: string | null) {
  const [state, setState] = useState<RoomSocketState>({
    members: [], memberCount: 0, roomName: '', roomStatus: '', hostId: null, hostUsername: '',
    maxMembers: 8, chatMessages: [], joinRequests: [], sessionId: null, isConnected: false, error: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const activeUrlRef = useRef<string | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const iid = useRef(`ws-${Math.random().toString(36).slice(2, 6)}`)

  useEffect(() => {
    const id = iid.current
    if (!roomCode || roomCode === '----' || !accessToken) {
      setState((s) => ({ ...s, error: 'Missing room code or access token' }))
      return
    }

    const url = `${BASE}/ws/room/${roomCode}/?token=${accessToken}`

    if (activeUrlRef.current === url && wsRef.current) {
      const rs = wsRef.current.readyState
      if (rs === WebSocket.OPEN) { setState((s) => ({ ...s, isConnected: true, error: null })); return }
      if (rs === WebSocket.CONNECTING) return
    }

    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; activeUrlRef.current = null }

    activeUrlRef.current = url
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
      setState((s) => ({ ...s, isConnected: true, error: null }))
    }

    ws.onmessage = (event) => {
      try {
        const msg: RoomServerMessage = JSON.parse(event.data as string)
        handleMessage(msg)
      } catch { /* ignore */ }
    }

    ws.onerror = () => {
      if (activeUrlRef.current !== url) return
      setState((s) => ({ ...s, error: 'WebSocket connection failed' }))
    }

    ws.onclose = (e) => {
      if (activeUrlRef.current !== url) return
      wsRef.current = null
      setState((s) => ({ ...s, isConnected: false }))
      if (e.code === 4001) setState((s) => ({ ...s, error: 'Room not found' }))
      else if (e.code === 4002) setState((s) => ({ ...s, error: 'Room is finished' }))
      else if (e.code === 4003 || e.code === 1006) {
        // 4003 = not a member, 1006 = abnormal (Daphne rejected handshake with 403)
        setState((s) => ({ ...s, error: 'Join via invite code first' }))
        retryTimerRef.current = setTimeout(() => setRetryCount((n) => n + 1), 10000)
      }
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [roomCode, accessToken, retryCount])

  function handleMessage(msg: RoomServerMessage) {
    switch (msg.type) {
      case 'room_state': {
        setState((s) => ({
          ...s,
          roomName: msg.room.name,
          roomStatus: msg.room.status,
          hostId: msg.room.host.id,
          hostUsername: msg.room.host.username,
          maxMembers: msg.room.max_members,
          memberCount: msg.member_count,
          members: msg.members.map((m) => ({
            user_id: m.id, username: m.username, isHost: m.is_host, isReady: false,
          })),
        }))
        break
      }
      case 'player_joined': {
        setState((s) => ({
          ...s,
          memberCount: msg.member_count,
          members: s.members.some((m) => m.user_id === msg.user_id)
            ? s.members
            : [...s.members, { user_id: msg.user_id, username: msg.username, isHost: false, isReady: false }],
        }))
        break
      }
      case 'player_left': {
        setState((s) => ({ ...s, memberCount: msg.member_count, members: s.members.filter((m) => m.user_id !== msg.user_id) }))
        break
      }
      case 'host_changed': {
        setState((s) => ({
          ...s,
          hostId: msg.new_host_id,
          hostUsername: msg.new_host_username,
          members: s.members.map((m) => ({
            ...m,
            isHost: m.user_id === msg.new_host_id ? true : (m.user_id === msg.previous_host_id ? false : m.isHost),
          })),
        }))
        break
      }
      case 'chat_message': {  // v2 renamed from "chat"
        setState((s) => ({ ...s, chatMessages: [...s.chatMessages, { user_id: msg.user_id, username: msg.username, message: msg.message }] }))
        break
      }
      // backward compat for v1
      case 'chat': {
        setState((s) => ({ ...s, chatMessages: [...s.chatMessages, { user_id: msg.user_id, username: msg.username, message: msg.message }] }))
        break
      }
      case 'join_request_received': {
        setState((s) => ({ ...s, joinRequests: [...s.joinRequests, { id: msg.request_id, user_id: msg.user_id, username: msg.username }] }))
        break
      }
      case 'game_started': {
        setState((s) => ({ ...s, sessionId: msg.session_id }))
        break
      }
      case 'room_closed': {
        setState((s) => ({ ...s, roomStatus: 'finished', error: 'Room closed by host' }))
        break
      }
      case 'member_removed': {
        setState((s) => ({ ...s, error: 'You were removed from the room' }))
        break
      }
      case 'vote_cast': { break }
    }
  }

  const send = useCallback((message: RoomClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(message))
  }, [])

  const sendChat = useCallback((text: string) => { send({ type: 'chat', message: text }) }, [send])
  const startGame = useCallback(() => { send({ type: 'start_game' }) }, [send])

  return { ...state, sendChat, startGame }
}
