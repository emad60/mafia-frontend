import { createFileRoute } from '@tanstack/react-router'
import { LobbyGateway } from '../features/dashboard'

export const Route = createFileRoute('/dashboard')({
  component: () => <LobbyGateway />,
})
