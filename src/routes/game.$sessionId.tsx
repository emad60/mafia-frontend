import { createFileRoute } from '@tanstack/react-router'
import { InGameView } from '../features/game'

export const Route = createFileRoute('/game/$sessionId')({
  component: () => <InGameView />,
})
