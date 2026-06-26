import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGameUI } from '../context/GameUIContext'
import { api } from '../lib/api'
import { LogOut, User } from 'lucide-react'

/** Compact user menu — username + logout dropdown */
export function UserMenu() {
  const { username, accessToken, refreshToken, logout } = useGameUI()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      if (refreshToken && accessToken) {
        await api.logout(refreshToken, accessToken).catch(() => {})
      }
    } finally {
      logout()
      navigate({ to: '/' })
      setLoggingOut(false)
    }
  }

  if (!username) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-dim)] bg-[var(--bg-raised)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-hover)]"
      >
        <User size={13} className="text-[var(--text-muted)]" />
        <span className="max-w-[80px] truncate">{username}</span>
        <svg className={`h-3 w-3 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-[var(--border-dim)] bg-[var(--color-surface)] p-1.5 shadow-xl shadow-black/30">
            <div className="border-b border-[var(--border-subtle)] px-3 py-2">
              <p className="text-xs font-medium text-[var(--text-primary)]">{username}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Signed in</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-accent-crimson)] transition-colors hover:bg-[var(--color-accent-crimson)]/10 disabled:opacity-50"
            >
              <LogOut size={13} />
              {loggingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
