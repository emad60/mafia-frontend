import AuthModal from './AuthModal'
import LandingPage from './LandingPage'

/** Combined landing route — page + auth modal overlay */
export function LandingRoute() {
  return (
    <>
      <AuthModal />
      <LandingPage />
    </>
  )
}
