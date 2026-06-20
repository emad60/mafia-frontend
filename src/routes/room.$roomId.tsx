import { createFileRoute } from '@tanstack/react-router'
import { WaitingRoom } from '../features/room'

export const Route = createFileRoute('/room/$roomId')({
  component: () => <WaitingRoom />,
})
