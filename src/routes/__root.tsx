import { createRootRoute, Outlet } from '@tanstack/react-router'
import { GameUIProvider } from '../context/GameUIContext'
import '../index.css'

/* ──────────────────────────────────────────────
   Root layout — global providers + Tailwind entry
   ────────────────────────────────────────────── */
export const Route = createRootRoute({
  component: () => (
    <GameUIProvider>
      <Outlet />
    </GameUIProvider>
  ),
})
