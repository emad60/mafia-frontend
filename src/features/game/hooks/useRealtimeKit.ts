import { useState, useEffect, useRef, useCallback } from 'react'
import Client from '@cloudflare/realtimekit'

/* ── Types ── */
export interface RTParticipant {
  id: string; name: string
  videoTrack: MediaStreamTrack | null; audioTrack: MediaStreamTrack | null
  videoEnabled: boolean; audioEnabled: boolean; isLocal: boolean
}

/* ── Helpers ── */
function arr(p: unknown) {
  const o: { id: string; name: string; videoTrack: unknown; audioTrack: unknown; videoEnabled: boolean; audioEnabled: boolean }[] = []
  try {
    const m = p as Map<string, unknown>
    if (typeof m.forEach === 'function') m.forEach((v, k) => o.push({ id: k, ...(v as object) }))
    else if (typeof (p as Record<string, unknown>).toArray === 'function') return (p as Record<string, () => unknown[]>).toArray() as unknown[]
  } catch { /* */ }
  return o
}

function ms(pid: string, ptoken: string, roomCode: string, mounted: () => boolean) {
  return {
    connect: async () => {
      const client = await Client.init({ authToken: ptoken })
      if (!mounted()) { client.leave().catch(() => {}); return null }
      await client.join()
      if (!mounted()) { client.leave().catch(() => {}); return null }
      const map = new Map<string, RTParticipant>()
      const selfId = client.self.id
      for (const p of arr(client.participants)) {
        map.set(p.id, { id: p.id, name: p.name, videoTrack: (p.videoTrack as MediaStreamTrack) ?? null, audioTrack: (p.audioTrack as MediaStreamTrack) ?? null, videoEnabled: p.videoEnabled, audioEnabled: p.audioEnabled, isLocal: false })
      }
      if (!mounted()) { client.leave().catch(() => {}); return null }
      await client.self.setupTracks({ video: true, audio: true })
      if (!mounted()) { client.leave().catch(() => {}); return null }
      // Read tracks AFTER setupTracks — they're null before
      const self: RTParticipant = { id: selfId, name: client.self.name || 'You', videoTrack: (client.self.videoTrack as MediaStreamTrack) ?? null, audioTrack: (client.self.audioTrack as MediaStreamTrack) ?? null, videoEnabled: true, audioEnabled: true, isLocal: true }
      map.set(selfId, self)
      return { client, map, self }
    },
  }
}

/* ── Hook ── */
export function useRealtimeKit(roomCode: string | null, _ready?: number) {
  const [s, ss] = useState({ participants: new Map<string, RTParticipant>(), local: null as RTParticipant | null, joined: false, joining: false, err: null as string | null })
  const clientRef = useRef<Client | null>(null)
  const pRef = useRef<Promise<{ client: Client; map: Map<string, RTParticipant>; self: RTParticipant } | null> | null>(null)
  const midRef = useRef(true)
  const initCallCount = useRef(0)
  useEffect(() => { midRef.current = true; return () => { midRef.current = false } }, [])

  useEffect(() => {
    console.log('[RTK] Effect running — roomCode:', roomCode, 'hasToken:', !!localStorage.getItem(`room_${roomCode}_ptoken`))
    if (!roomCode || roomCode === '----') return
    const token = localStorage.getItem(`room_${roomCode}_ptoken`)
    if (!token) return
    if (clientRef.current) return  // already connected

    // Reuse pending init from StrictMode remount
    if (pRef.current) { console.log('[RTK] Awaiting pending init...'); return }

    ss((x) => ({ ...x, joining: true, err: null }))
    const svc = ms('', token, roomCode, () => midRef.current)
    const promise = svc.connect()
    pRef.current = promise

    promise.then((result) => {
      pRef.current = null
      if (!result || !midRef.current) return
      clientRef.current = result.client
      ss({ participants: result.map, local: result.self, joined: true, joining: false, err: null })
    }).catch((err) => {
      pRef.current = null
      if (midRef.current) ss((x) => ({ ...x, joining: false, err: err instanceof Error ? err.message : 'Failed' }))
    })
  }, [roomCode, _ready])

  // Poll participants periodically — SDK event listeners are unreliable across versions
  useEffect(() => {
    if (!s.joined) return
    const interval = setInterval(() => {
      const client = clientRef.current
      if (!client) return
      const map = new Map<string, RTParticipant>()
      const selfId = client.self.id
      for (const p of arr(client.participants)) {
        map.set(p.id, {
          id: p.id, name: p.name,
          videoTrack: (p.videoTrack as MediaStreamTrack) ?? null,
          audioTrack: (p.audioTrack as MediaStreamTrack) ?? null,
          videoEnabled: p.videoEnabled, audioEnabled: p.audioEnabled,
          isLocal: false,
        })
      }
      const self: RTParticipant = {
        id: selfId, name: client.self.name || 'You',
        videoTrack: (client.self.videoTrack as MediaStreamTrack) ?? null,
        audioTrack: (client.self.audioTrack as MediaStreamTrack) ?? null,
        videoEnabled: client.self.videoEnabled, audioEnabled: client.self.audioEnabled,
        isLocal: true,
      }
      map.set(selfId, self)
      ss((x) => {
        // Only update if participant count changed or track references differ
        if (map.size === x.participants.size) {
          let changed = false
          for (const [id, p] of map) {
            const existing = x.participants.get(id)
            if (!existing || existing.videoTrack !== p.videoTrack || existing.audioTrack !== p.audioTrack) {
              changed = true; break
            }
          }
          if (!changed) return x
        }
        return { ...x, participants: map, local: self }
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [s.joined])

  // Only clean up on real unmount, not StrictMode remount.
  // The [roomCode] effect handles reconnection when room changes.
  useEffect(() => {
    return () => {
      // Small delay — if we re-mount within 100ms (StrictMode), skip cleanup
      const client = clientRef.current
      const pr = pRef.current
      setTimeout(() => {
        // If the refs haven't changed after 100ms, it's a real unmount
        if (clientRef.current === client && pRef.current === pr) {
          clientRef.current?.leave()?.catch(() => {})
          clientRef.current = null
          pRef.current = null
          if (midRef.current) {
            ss({ participants: new Map(), local: null, joined: false, joining: false, err: null })
          }
        }
      }, 200)
    }
  }, [])

  const tm = useCallback(async () => {
    const c = clientRef.current; if (!c) return
    const on = !c.self.audioEnabled
    // Just flip the track — don't reinitialize via setupTracks
    if (c.self.audioTrack) c.self.audioTrack.enabled = on
    ss((x) => { if (!x.local) return x; const u = { ...x.local, audioEnabled: on }; const m = new Map(x.participants); m.set(u.id, u); return { ...x, local: u, participants: m } })
  }, [])
  const tc = useCallback(async () => {
    const c = clientRef.current; if (!c) return
    const on = !c.self.videoEnabled
    if (c.self.videoTrack) c.self.videoTrack.enabled = on
    ss((x) => { if (!x.local) return x; const u = { ...x.local, videoEnabled: on }; const m = new Map(x.participants); m.set(u.id, u); return { ...x, local: u, participants: m } })
  }, [])

  return { participants: s.participants, localParticipant: s.local, isJoined: s.joined, isJoining: s.joining, error: s.err, isMuted: s.local ? !s.local.audioEnabled : false, isCameraOff: s.local ? !s.local.videoEnabled : false, toggleMute: tm, toggleCamera: tc }
}
