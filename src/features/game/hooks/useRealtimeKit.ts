import { useState, useEffect, useRef, useCallback } from 'react'
import Client from '@cloudflare/realtimekit'

/* ──────────────────────────────────────────────
   RealtimeKit video/audio hook
   Uses the participant token from the backend
   to join a Cloudflare Realtime meeting.
   ────────────────────────────────────────────── */

export interface RTParticipant {
  id: string
  name: string
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  videoEnabled: boolean
  audioEnabled: boolean
  isLocal: boolean
}

interface RTState {
  participants: Map<string, RTParticipant>
  localParticipant: RTParticipant | null
  isJoined: boolean
  isJoining: boolean
  error: string | null
}

export function useRealtimeKit(roomCode: string | null) {
  const [state, setState] = useState<RTState>({
    participants: new Map(),
    localParticipant: null,
    isJoined: false,
    isJoining: false,
    error: null,
  })

  const clientRef = useRef<Client | null>(null)
  const joinedRef = useRef(false)

  /* ── Join meeting ── */
  const join = useCallback(async () => {
    if (!roomCode || roomCode === '----') return
    const token = sessionStorage.getItem(`room_${roomCode}_ptoken`)
    if (!token) {
      setState((s) => ({ ...s, error: 'No participant token found. Create or join a room first.' }))
      return
    }

    if (joinedRef.current) return
    joinedRef.current = true
    setState((s) => ({ ...s, isJoining: true, error: null }))

    try {
      const client = await Client.init({ authToken: token })
      clientRef.current = client

      await client.join()

      // Build participant map
      const map = new Map<string, RTParticipant>()
      const selfId = client.self.id

      // Add remote participants
      for (const [id, p] of client.participants) {
        map.set(id, {
          id,
          name: p.name,
          videoTrack: p.videoTrack ?? null,
          audioTrack: p.audioTrack ?? null,
          videoEnabled: p.videoEnabled,
          audioEnabled: p.audioEnabled,
          isLocal: false,
        })
      }

      // Add self
      const self: RTParticipant = {
        id: selfId,
        name: client.self.name || 'You',
        videoTrack: client.self.videoTrack ?? null,
        audioTrack: client.self.audioTrack ?? null,
        videoEnabled: true,
        audioEnabled: true,
        isLocal: true,
      }
      map.set(selfId, self)

      // Enable media
      await client.self.setupTracks({ video: true, audio: true })

      setState({
        participants: map,
        localParticipant: self,
        isJoined: true,
        isJoining: false,
        error: null,
      })
    } catch (err) {
      joinedRef.current = false
      setState((s) => ({
        ...s,
        isJoining: false,
        error: err instanceof Error ? err.message : 'Failed to join meeting',
      }))
    }
  }, [roomCode])

  /* ── Leave ── */
  const leave = useCallback(async () => {
    if (clientRef.current) {
      try { await clientRef.current.leave() } catch { /* */ }
      clientRef.current = null
    }
    joinedRef.current = false
    setState({
      participants: new Map(),
      localParticipant: null,
      isJoined: false,
      isJoining: false,
      error: null,
    })
  }, [])

  /* ── Toggle mute ── */
  const toggleMute = useCallback(async () => {
    if (!clientRef.current) return
    const audioEnabled = !clientRef.current.self.audioEnabled
    await clientRef.current.self.setupTracks({ audio: audioEnabled })
    setState((s) => {
      if (!s.localParticipant) return s
      const updated = { ...s.localParticipant, audioEnabled }
      const map = new Map(s.participants)
      map.set(updated.id, updated)
      return { ...s, localParticipant: updated, participants: map }
    })
  }, [])

  /* ── Toggle camera ── */
  const toggleCamera = useCallback(async () => {
    if (!clientRef.current) return
    const videoEnabled = !clientRef.current.self.videoEnabled
    await clientRef.current.self.setupTracks({ video: videoEnabled })
    setState((s) => {
      if (!s.localParticipant) return s
      const updated = { ...s.localParticipant, videoEnabled }
      const map = new Map(s.participants)
      map.set(updated.id, updated)
      return { ...s, localParticipant: updated, participants: map }
    })
  }, [])

  /* ── Auto-join on mount ── */
  useEffect(() => {
    join()
    return () => { leave() }
  }, [join, leave])

  /* ── Listen for participant join/leave events ── */
  useEffect(() => {
    const client = clientRef.current
    if (!client || !state.isJoined) return

    const onParticipantJoined = (p: RTParticipant) => {
      setState((s) => {
        const map = new Map(s.participants)
        map.set(p.id, p)
        return { ...s, participants: map }
      })
    }
    const onParticipantLeft = (id: string) => {
      setState((s) => {
        const map = new Map(s.participants)
        map.delete(id)
        return { ...s, participants: map }
      })
    }

    client.participants.on('participantJoined', onParticipantJoined)
    client.participants.on('participantLeft', onParticipantLeft)

    return () => {
      client.participants.off('participantJoined', onParticipantJoined)
      client.participants.off('participantLeft', onParticipantLeft)
    }
  }, [state.isJoined])

  return {
    ...state,
    isMuted: state.localParticipant ? !state.localParticipant.audioEnabled : false,
    isCameraOff: state.localParticipant ? !state.localParticipant.videoEnabled : false,
    toggleMute,
    toggleCamera,
    leave,
  }
}
