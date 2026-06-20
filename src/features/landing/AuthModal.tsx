import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGameUI } from '../../context/GameUIContext'
import { Button } from '../../components'
import { api } from '../../lib/api'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

/* ──────────────────────────────────────────────
   Validation helpers
   ────────────────────────────────────────────── */
type FieldErrors = Record<string, string>

function validateSignIn(username: string, password: string): FieldErrors {
  const errs: FieldErrors = {}
  if (!username.trim()) errs.username = 'Username is required.'
  if (!password) errs.password = 'Password is required.'
  return errs
}

function validateSignUp(
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
  acceptedTerms: boolean,
): FieldErrors {
  const errs: FieldErrors = {}
  if (!username.trim()) errs.username = 'Username is required.'
  else if (username.trim().length < 3) errs.username = 'Username must be at least 3 characters.'
  if (!email.trim()) errs.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address.'
  if (!password) errs.password = 'Password is required.'
  else if (password.length < 8) errs.password = 'Password must be at least 8 characters.'
  if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.'
  if (!acceptedTerms) errs.terms = 'You must accept the rules and privacy policy.'
  return errs
}

/* ──────────────────────────────────────────────
   Field component — floating label + error
   ────────────────────────────────────────────── */
function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  autoComplete?: string
}) {
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          autoComplete={autoComplete}
          className={`peer w-full rounded-xl border bg-white/[0.03] px-4 pb-3 pt-5 text-sm text-zinc-100 outline-none transition-all duration-200 placeholder-shown:pt-4 focus:bg-white/[0.05] ${
            error
              ? 'border-[var(--color-accent-crimson)]/50 focus:border-[var(--color-accent-crimson)]'
              : 'border-white/[0.06] focus:border-[var(--color-accent-slate)]/60'
          }`}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-4 transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs top-2 text-xs ${
            error
              ? 'text-[var(--color-accent-crimson)] peer-focus:text-[var(--color-accent-crimson)]'
              : 'text-zinc-500 peer-placeholder-shown:text-zinc-500 peer-focus:text-[var(--color-accent-slate)]'
          }`}
        >
          {label}
        </label>
      </div>
      {hint && !error && (
        <span className="mt-1 block text-[10px] text-zinc-600">{hint}</span>
      )}
      {error && (
        <motion.span className="mt-1 block text-[10px] text-[var(--color-accent-crimson)]" initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }}>
          {error}
        </motion.span>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Auth Modal — separated Sign In / Sign Up
   ────────────────────────────────────────────── */
export default function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal, openAuthModal, login } = useGameUI()
  const navigate = useNavigate()

  if (!authModalOpen) return null

  const isSignIn = authModalMode === 'signin'

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label={isSignIn ? 'Sign In' : 'Sign Up'}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
        />

        {/* Modal card */}
        <motion.div
          className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[#18181B]/95 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <button onClick={closeAuthModal} className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition-all duration-200 hover:bg-white/[0.06] hover:text-zinc-200" aria-label="Close">
            <X size={18} />
          </button>

          <motion.div
            key={authModalMode}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              {isSignIn ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              {isSignIn
                ? 'Sign in to join your lobby.'
                : 'One step away from the table.'}
            </p>
          </motion.div>

          {isSignIn ? (
            <SignInForm login={login} navigate={navigate} />
          ) : (
            <SignUpForm login={login} navigate={navigate} />
          )}

          {/* Toggle mode */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => openAuthModal(isSignIn ? 'signup' : 'signin')}
              className="font-medium text-[var(--color-accent-slate)] underline-offset-4 transition-colors hover:text-[var(--color-accent-slate)]/80 hover:underline"
            >
              {isSignIn ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ──────────────────────────────────────────────
   Sign In form
   ────────────────────────────────────────────── */
function SignInForm({
  login,
  navigate,
}: {
  login: (username: string, password: string) => Promise<unknown>
  navigate: (opts: { to: string }) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const fieldErrors = validateSignIn(username, password)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setServerError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      setUsername('')
      setPassword('')
      navigate({ to: '/dashboard' })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      {serverError && (
        <motion.div className="rounded-lg border border-[var(--color-accent-crimson)]/30 bg-[var(--color-accent-crimson)]/10 px-3 py-2 text-xs text-[var(--color-accent-crimson)]" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          {serverError}
        </motion.div>
      )}

      <Field id="signin-username" label="Username" value={username} onChange={(v) => { setUsername(v); setErrors((p) => ({ ...p, username: '' })) }} error={errors.username} autoComplete="username" />
      <Field id="signin-password" label="Password" type="password" value={password} onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })) }} error={errors.password} autoComplete="current-password" />

      <Button type="submit" variant="primary" className="w-full py-3 text-sm font-semibold" disabled={submitting}>
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Signing in…
          </span>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  )
}

/* ──────────────────────────────────────────────
   Sign Up form
   ────────────────────────────────────────────── */
function SignUpForm({
  login,
  navigate,
}: {
  login: (username: string, password: string) => Promise<unknown>
  navigate: (opts: { to: string }) => void
}) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const fieldErrors = validateSignUp(username, email, password, confirmPassword, acceptedTerms)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setServerError(null)
    setSubmitting(true)
    try {
      await api.register({ username: username.trim(), email: email.trim(), password })
      await login(username.trim(), password)
      setUsername(''); setEmail(''); setPassword(''); setConfirmPassword(''); setAcceptedTerms(false)
      navigate({ to: '/dashboard' })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  const clear = (field: string) => setErrors((p) => { const n = { ...p }; delete n[field]; return n })

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      {serverError && (
        <motion.div className="rounded-lg border border-[var(--color-accent-crimson)]/30 bg-[var(--color-accent-crimson)]/10 px-3 py-2 text-xs text-[var(--color-accent-crimson)]" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          {serverError}
        </motion.div>
      )}

      <Field id="signup-username" label="Username" value={username} onChange={(v) => { setUsername(v); clear('username') }} error={errors.username} autoComplete="username" />
      <Field id="signup-email" label="Email address" type="email" value={email} onChange={(v) => { setEmail(v); clear('email') }} error={errors.email} autoComplete="email" />
      <Field id="signup-password" label="Password" type="password" value={password} onChange={(v) => { setPassword(v); clear('password'); clear('confirmPassword') }} error={errors.password} hint="Min 8 characters" autoComplete="new-password" />
      <Field id="signup-confirm" label="Confirm password" type="password" value={confirmPassword} onChange={(v) => { setConfirmPassword(v); clear('confirmPassword') }} error={errors.confirmPassword} autoComplete="new-password" />

      {/* Terms checkbox */}
      <label className={`flex items-start gap-2.5 cursor-pointer ${errors.terms ? 'text-[var(--color-accent-crimson)]' : 'text-zinc-500'}`}>
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => { setAcceptedTerms(e.target.checked); clear('terms') }}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/[0.15] bg-white/[0.04] text-[var(--color-accent-slate)] focus:ring-[var(--color-accent-slate)]"
        />
        <span className="text-[11px] leading-relaxed">
          I accept the{' '}
          <span className="underline underline-offset-2">rules</span>
          {' '}and{' '}
          <span className="underline underline-offset-2">privacy policy</span>
        </span>
      </label>
      {errors.terms && (
        <motion.span className="-mt-3 text-[10px] text-[var(--color-accent-crimson)]" initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }}>
          {errors.terms}
        </motion.span>
      )}

      <Button type="submit" variant="primary" className="w-full py-3 text-sm font-semibold" disabled={submitting}>
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Creating account…
          </span>
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  )
}
