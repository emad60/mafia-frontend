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
      const self: RTParticipant = { id: selfId, name: client.self.name || 'You', videoTrack: (client.self.videoTrack as MediaStreamTrack) ?? null, audioTrack: (client.self.audioTrack as MediaStreamTrack) ?? null, videoEnabled: true, audioEnabled: true, isLocal: true }
      map.set(selfId, self)
      if (!mounted()) { client.leave().catch(() => {}); return null }
      await client.self.setupTracks({ video: true, audio: true })
      if (!mounted()) { client.leave().catch(() => {}); return null }
      return { client, map, self }
    },
  }
}

/* ── Hook ── */
export function useRealtimeKit(roomCode: string | null) {
  const [s, ss] = useState({ participants: new Map<string, RTParticipant>(), local: null as RTParticipant | null, joined: false, joining: false, err: null as string | null })
  const clientRef = useRef<Client | null>(null)
  const pRef = useRef<Promise<{ client: Client; map: Map<string, RTParticipant>; self: RTParticipant } | null> | null>(null)
  const midRef = useRef(true)
  useEffect(() => { midRef.current = true; return () => { midRef.current = false } }, [])

  useEffect(() => {
    if (!roomCode || roomCode === '----') return
    const token = sessionStorage.getItem(`room_${roomCode}_ptoken`)
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
  }, [roomCode])

  useEffect(() => () => {
    clientRef.current?.leave()?.catch(() => {})
    clientRef.current = null
    pRef.current = null
    ss({ participants: new Map(), local: null, joined: false, joining: false, err: null })
  }, [])

  const tm = useCallback(async () => {
    const c = clientRef.current; if (!c) return
    const on = !c.self.audioEnabled
    await c.self.setupTracks({ audio: on })
    ss((x) => { if (!x.local) return x; const u = { ...x.local, audioEnabled: on }; const m = new Map(x.participants); m.set(u.id, u); return { ...x, local: u, participants: m } })
  }, [])
  const tc = useCallback(async () => {
    const c = clientRef.current; if (!c) return
    const on = !c.self.videoEnabled
    await c.self.setupTracks({ video: on })
    ss((x) => { if (!x.local) return x; const u = { ...x.local, videoEnabled: on }; const m = new Map(x.participants); m.set(u.id, u); return { ...x, local: u, participants: m } })
  }, [])

  return { participants: s.participants, localParticipant: s.local, isJoined: s.joined, isJoining: s.joining, error: s.err, isMuted: s.local ? !s.local.audioEnabled : false, isCameraOff: s.local ? !s.local.videoEnabled : false, toggleMute: tm, toggleCamera: tc }
}
