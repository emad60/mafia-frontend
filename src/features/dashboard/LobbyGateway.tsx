import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGameUI } from '../../context/GameUIContext'
import { api } from '../../lib/api'
import { Play, LogIn, ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'

export default function LobbyGateway() {
  const { accessToken, setRoomCode, logout } = useGameUI()
  const navigate = useNavigate()

  const [roomName, setRoomName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [pendingCode, setPendingCode] = useState<string | null>(null)

  const isAuth = !!accessToken

  const handleCreate = async () => {
    if (!isAuth) { setError('Sign in first.'); return }
    if (!roomName.trim()) { setError('Enter a room name.'); return }
    setError('')
    setCreating(true)
    try {
      const res = await api.createRoom(roomName.trim(), 8, accessToken!)
      // Store participant credentials for future video chat
      console.log('[LobbyGateway] Create response:', JSON.stringify({ code: res.room.code, hasPid: !!res.participant_id, hasToken: !!res.token }))
      if (res.participant_id && res.token) {
        localStorage.setItem(`room_${res.room.code}_pid`, res.participant_id)
        localStorage.setItem(`room_${res.room.code}_ptoken`, res.token)
        console.log('[LobbyGateway] Token stored in localStorage under key:', `room_${res.room.code}_ptoken`)
      } else {
        console.warn('[LobbyGateway] No participant credentials in response!', res)
      }
      setRoomCode(res.room.code)
      navigate({ to: '/room/$roomId', params: { roomId: res.room.code } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase()
    if (code.length < 4) { setError('Enter a valid invite code.'); return }
    if (!isAuth) { setError('Sign in first.'); return }
    setError('')
    setJoining(true)
    try {
      const res = await api.joinRoom(code, accessToken!)
      if (res.room && res.participant_id && res.token) {
        // Direct join — store credentials and navigate
        localStorage.setItem(`room_${res.room.code}_pid`, res.participant_id)
        localStorage.setItem(`room_${res.room.code}_ptoken`, res.token)
        setRoomCode(res.room.code)
        navigate({ to: '/room/$roomId', params: { roomId: code } })
      } else if (res.request_id && res.status === 'pending') {
        // Host approval needed — stay on dashboard, show pending
        setPendingCode(code)
        setError('')
      } else {
        setError('Unexpected response from server.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    } finally {
      setJoining(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin()
  }

  // Poll join status while waiting for host approval
  useEffect(() => {
    if (!pendingCode || !isAuth) return
    const poll = async () => {
      try {
        // Use credentials endpoint — returns 200 + token when member, 403 if not yet accepted
        const creds = await api.getCredentials(pendingCode, accessToken!)
        if (creds.participant_id && creds.token) {
          localStorage.setItem(`room_${pendingCode}_pid`, creds.participant_id)
          localStorage.setItem(`room_${pendingCode}_ptoken`, creds.token)
          setRoomCode(pendingCode)
          setPendingCode(null)
          navigate({ to: '/room/$roomId', params: { roomId: pendingCode } })
        }
      } catch { /* 403 = not a member yet — keep polling */ }
    }
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [pendingCode, isAuth, accessToken, navigate, setRoomCode])

  const handleBack = () => { logout(); navigate({ to: '/' }) }

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-background)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--color-background)]/80 backdrop-blur-md px-6">
        <span className="select-none text-sm font-bold tracking-[0.3em] text-[var(--text-primary)]">MAFIA</span>
        <button onClick={handleBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline">
          <ArrowLeft size={13} />Back
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <motion.div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-surface)]/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Join the Table</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">Create a new room as host, or join an existing game.</p>
          </div>

          {/* Create Room */}
          <div className="mb-5 flex flex-col gap-3">
            <input
              type="text"
              value={roomName}
              onChange={(e) => { setRoomName(e.target.value); setError('') }}
              placeholder="Room name (e.g. Friday Night Mafia)"
              maxLength={100}
              className="w-full rounded-xl border border-[var(--border-dim)] bg-[var(--bg-raised)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[var(--color-accent-slate)]/60"
            />
            <button onClick={handleCreate} disabled={creating || !isAuth}
              className="group relative w-full overflow-hidden rounded-2xl border border-[var(--color-accent-slate)]/40 bg-[var(--color-accent-slate)] py-4 text-sm font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-[var(--color-accent-slate)]/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-[var(--color-accent-slate)]/35 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative inline-flex items-center gap-2.5">
                {creating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Play size={18} />}
                {creating ? 'Creating…' : 'Create Room'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border-dim)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--text-muted)]">or join existing</span>
            <div className="h-px flex-1 bg-[var(--border-dim)]" />
          </div>

          {/* Join Room */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <input type="text" value={inviteCode} onChange={(e) => { setInviteCode(e.target.value.toUpperCase().slice(0, 8)); setError('') }} onKeyDown={handleKeyDown} placeholder="Enter Invite Code…" maxLength={8} spellCheck={false} autoComplete="off"
                  className="w-full rounded-xl border border-[var(--border-dim)] bg-[var(--bg-raised)] px-4 py-3 font-mono text-sm font-medium tracking-[0.15em] text-[var(--text-primary)] placeholder:font-sans placeholder:text-xs placeholder:tracking-normal placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[var(--color-accent-slate)]/60" />
                {inviteCode.length > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-[var(--text-muted)]">{inviteCode.length}/8</span>}
              </div>
              <button onClick={handleJoin} disabled={joining || !isAuth}
                className="shrink-0 rounded-xl border border-[var(--border-hover)] bg-[var(--bg-raised)] px-5 py-3 text-xs font-semibold text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                <span className="inline-flex items-center gap-2">
                  {joining ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <LogIn size={14} />}
                  {joining ? 'Joining…' : 'Join Room'}
                </span>
              </button>
            </div>
            {error && <motion.p className="text-[11px] font-medium text-[var(--color-accent-crimson)]" initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.p>}
          </div>

          {/* Pending approval banner */}
          {pendingCode && (
            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-4 text-center">
              <p className="text-sm font-medium text-amber-400/90">Request sent — waiting for host</p>
              <p className="mt-1 text-[11px] text-amber-400/70">Room {pendingCode}</p>
              <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-amber-400/60">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                Checking for approval…
              </div>
              <button onClick={() => setPendingCode(null)}
                className="mt-3 text-[10px] text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text-primary)]">
                Cancel
              </button>
            </div>
          )}

          {!isAuth && (
            <p className="mt-5 text-center text-[11px] leading-relaxed text-amber-400/80">Sign in to create or join a room.</p>
          )}
          {!pendingCode && <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">The host controls match settings. Guests need the room code.</p>}
        </motion.div>
      </main>
    </div>
  )
}
