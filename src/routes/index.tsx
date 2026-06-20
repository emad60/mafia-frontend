import { createFileRoute } from '@tanstack/react-router'
import { LandingRoute } from '../features/landing'

export const Route = createFileRoute('/')({
  component: () => <LandingRoute />,
})
