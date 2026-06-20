import { useNavigate } from '@tanstack/react-router'
import { useGameUI } from '../../context/GameUIContext'
import { Button } from '../../components'
import { Skull, Eye, Shield, Play, Users, MessageCircle } from 'lucide-react'
import { motion } from 'motion/react'

/* ──────────────────────────────────────────────
   Role definitions — micro-copy + accent mapping
   ────────────────────────────────────────────── */
const MAFIA_ROLE = {
  icon: Skull,
  label: 'The Mafia',
  tagline: 'Informed minority',
  description:
    'Coordinate in secret. Eliminate a town member each night. Maintain a flawless alibi by day.',
  accent: 'text-[var(--color-accent-crimson)]',
  accentBg: 'bg-[var(--color-accent-crimson)]/8',
  accentBorder: 'border-[var(--color-accent-crimson)]/15',
  accentGlow: 'group-hover:shadow-[var(--color-accent-crimson)]/8',
  action: 'Eliminate by night',
}

const DETECTIVE_ROLE = {
  icon: Eye,
  label: 'The Detective',
  tagline: 'Town investigator',
  description:
    'Investigate one player each night to learn their true faction. Guide the town without exposing yourself.',
  accent: 'text-[var(--color-accent-slate)]',
  accentBg: 'bg-[var(--color-accent-slate)]/8',
  accentBorder: 'border-[var(--color-accent-slate)]/15',
  accentGlow: 'group-hover:shadow-[var(--color-accent-slate)]/8',
  action: 'Investigate nightly',
}

const DOCTOR_ROLE = {
  icon: Shield,
  label: 'The Doctor',
  tagline: 'Protector',
  description:
    'Choose one player to shield each night. Save innocents from elimination and turn the tide of the game.',
  accent: 'text-emerald-400',
  accentBg: 'bg-emerald-400/8',
  accentBorder: 'border-emerald-400/15',
  accentGlow: 'group-hover:shadow-emerald-400/8',
  action: 'Protect one life',
}

/* ──────────────────────────────────────────────
   Split-screen game preview tiles
   ────────────────────────────────────────────── */
function GamePreviewCard() {
  return (
    <div
      className="
        relative overflow-hidden rounded-2xl
        border border-white/[0.06] bg-[#18181B]/60
        p-6 backdrop-blur-sm
      "
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--color-accent-slate)]/5 blur-3xl" />
      <div className="relative space-y-4">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { active: true, label: 'You' },
            { active: true, label: 'Marco' },
            { active: true, label: 'Elena' },
            { active: false, label: 'Lucas' },
            { active: true, label: 'Sofia' },
            { active: false, label: 'Open' },
          ].map((tile, i) => (
            <div
              key={i}
              className={`
                group/tile relative aspect-[4/3] overflow-hidden rounded-lg border
                transition-all duration-300
                ${tile.active
                  ? 'border-white/[0.06] bg-[#1C1C1F]'
                  : 'border-dashed border-white/[0.03] bg-transparent'
                }
              `}
            >
              {tile.active ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-slate)]/10 via-transparent to-transparent" />
                  <span className="absolute bottom-1.5 left-2 text-[10px] font-medium text-zinc-400">{tile.label}</span>
                  <span className="absolute bottom-1.5 right-2 h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
                </>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-700">+</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-zinc-600" />
              <span className="text-[11px] text-zinc-500">6 connected</span>
            </div>
            <div className="h-4 w-px bg-white/[0.06]" />
            <div className="flex items-center gap-1.5">
              <MessageCircle size={13} className="text-zinc-600" />
              <span className="text-[11px] text-zinc-500">Day Phase</span>
            </div>
          </div>
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400/60 ring-2 ring-emerald-400/20" />
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Single role card — bento grid unit
   ────────────────────────────────────────────── */
function RoleCard({ role, className = '' }: { role: typeof MAFIA_ROLE; className?: string }) {
  const Icon = role.icon
  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl
        border border-white/[0.04] bg-[#18181B]/50
        p-6 transition-all duration-300
        hover:border-white/[0.08] hover:bg-[#1C1C1F]
        hover:shadow-xl ${role.accentGlow}
        ${className}
      `}
    >
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${role.accentBg}`} />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-300 ${role.accentBorder} ${role.accentBg}`}>
            <Icon size={20} className={role.accent} />
          </div>
          <span className="rounded-full border border-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 transition-colors duration-300 group-hover:border-white/[0.08] group-hover:text-zinc-400">
            {role.action}
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold tracking-tight text-zinc-200">{role.label}</h3>
            <span className="text-[11px] font-medium text-zinc-600">{role.tagline}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{role.description}</p>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Premium Landing Page
   ────────────────────────────────────────────── */
export default function LandingPage() {
  const { openAuthModal, isAuthenticated } = useGameUI()
  const navigate = useNavigate()

  const handleJoin = () => {
    if (!isAuthenticated) {
      openAuthModal('signin')
    } else {
      navigate({ to: '/dashboard' })
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-background)]">
      {/* ── Navigation — glassmorphism ── */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.04] bg-[#09090B]/70 backdrop-blur-md px-6">
        <span className="select-none text-sm font-bold tracking-[0.3em] text-zinc-100">MAFIA</span>
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <Button variant="ghost" onClick={() => navigate({ to: '/dashboard' })}>My Lobby</Button>
          ) : (
            <>
              <button onClick={() => openAuthModal('signin')} className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-zinc-300 transition-all duration-200 hover:border-white/[0.15] hover:text-zinc-100 hover:bg-white/[0.03]">Sign In</button>
              <button onClick={() => openAuthModal('signup')} className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition-all duration-200 hover:bg-zinc-200 active:scale-[0.97]">Sign Up</button>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-6 pb-12 pt-24 sm:pt-32">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start text-left">
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.1] lg:text-6xl lg:leading-[1.08]">
              <span className="bg-gradient-to-b from-zinc-200 via-zinc-100 to-white bg-clip-text text-transparent">The party game</span><br />
              <span className="bg-gradient-to-r from-[var(--color-accent-slate)] via-[var(--color-accent-slate)] to-[var(--color-accent-crimson)] bg-clip-text text-transparent">reimagined for video.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-500">Deception, deduction, and face-to-face accusation — streamed in real time. No downloads, no friction. Share a link and the table is set.</p>
            <div className="mt-8 flex items-center gap-4">
              <Button variant="primary" className="px-8 py-3.5 text-sm font-semibold" onClick={handleJoin}>
                <Play size={16} className="mr-1" />
                {isAuthenticated ? 'Go to Lobby' : 'Create a Lobby'}
              </Button>
              {!isAuthenticated && (
                <button onClick={handleJoin} className="text-sm font-medium text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline">Join with invite</button>
              )}
            </div>
          </div>
          <div className="hidden lg:block"><GamePreviewCard /></div>
        </div>
      </section>

      {/* ── Roles Bento Grid ── */}
      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto max-w-5xl">
          <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Core Roles</p>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <RoleCard role={MAFIA_ROLE} className="lg:row-span-2" />
            <RoleCard role={DETECTIVE_ROLE} />
            <RoleCard role={DOCTOR_ROLE} />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="flex flex-col items-center gap-5 px-6 pb-24 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-zinc-500">No accounts required for guests. Just a link and a camera.</p>
        <Button variant="primary" className="px-10 py-3.5 text-sm font-semibold" onClick={handleJoin}>
          {isAuthenticated ? 'Enter Lobby' : 'Start Playing — Free'}
        </Button>
      </section>
    </div>
  )
}
