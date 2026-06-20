import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Subtle glow on hover — off by default for minimalism */
  glowOnHover?: boolean
}

/**
 * Minimal surface card.
 * Uses Tailwind's surface / border tokens from the theme.
 */
export function Card({ children, className = '', glowOnHover = false }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]
        p-6 transition-all duration-300
        ${glowOnHover ? 'hover:border-[var(--color-accent-slate)] hover:shadow-lg hover:shadow-[var(--color-accent-slate)]/10' : ''}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  )
}
