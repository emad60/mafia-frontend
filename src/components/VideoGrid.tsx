import type { ReactNode } from 'react'

interface VideoGridProps {
  children: ReactNode
  /** Number of columns — defaults to auto-fit responsive */
  cols?: number
  className?: string
}

/**
 * Responsive video-tile grid.
 * Auto-fits tiles; pass `cols` to lock a column count.
 */
export function VideoGrid({ children, cols, className = '' }: VideoGridProps) {
  return (
    <div
      className={`
        grid gap-4
        ${className}
      `.trim()}
      style={{
        gridTemplateColumns: cols
          ? `repeat(${cols}, minmax(0, 1fr))`
          : 'repeat(auto-fit, minmax(240px, 1fr))',
      }}
    >
      {children}
    </div>
  )
}
