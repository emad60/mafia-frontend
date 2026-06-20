import { useGameUI } from '../context/GameUIContext'
import { Moon, Sun } from 'lucide-react'

/* ──────────────────────────────────────────────
   Minimalist theme toggle — Sun / Moon icons
   ────────────────────────────────────────────── */
export function ThemeToggle() {
  const { theme, toggleTheme } = useGameUI()

  return (
    <button
      onClick={toggleTheme}
      className="
        inline-flex h-8 w-8 items-center justify-center
        rounded-lg border border-[var(--border-dim)]
        bg-[var(--bg-raised)]
        text-[var(--text-muted)]
        transition-all duration-300
        hover:border-[var(--border-hover)]
        hover:text-[var(--text-secondary)]
      "
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={15} className="transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon size={15} className="transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  )
}
