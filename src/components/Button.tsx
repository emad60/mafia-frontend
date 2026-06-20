import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent-slate)] text-white hover:bg-[var(--color-accent-slate)]/90 shadow-md shadow-[var(--color-accent-slate)]/20',
  danger:
    'bg-[var(--color-accent-crimson)] text-white hover:bg-[var(--color-accent-crimson)]/90 shadow-md shadow-[var(--color-accent-crimson)]/20',
  ghost:
    'bg-transparent text-zinc-400 border border-[var(--color-border)] hover:border-zinc-500 hover:text-zinc-200',
}

/**
 * Single button primitive — three variants, zero bloat.
 */
export function Button({
  children,
  variant = 'primary',
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl
        px-5 py-2.5 text-sm font-semibold
        transition-all duration-200
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-slate)]
        disabled:pointer-events-none disabled:opacity-40
        ${variantClasses[variant]}
        ${className}
      `.trim()}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}
