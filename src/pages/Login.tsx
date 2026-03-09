import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

export function Login() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { sendOtp, verifyOtp } = useAuth()

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await sendOtp(email)
      if (error) {
        setError(error.message)
      } else {
        setStep('code')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await verifyOtp(email, token)
      if (error) {
        setError(error.message)
      }
      // On success, AuthContext updates user state → App router redirects to Home
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setToken('')
    const { error } = await sendOtp(email)
    if (error) setError(error.message)
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">Music Ideas</h1>
          <p className="login-subtitle">
            {step === 'email' ? 'Enter your email to get started' : `Code sent to ${email}`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            {error && <div className="form-message error">{error}</div>}

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="form-group">
              <label htmlFor="token">Verification Code</label>
              <input
                id="token"
                type="text"
                inputMode="numeric"
                value={token}
                onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                autoFocus
                className="code-input"
              />
            </div>

            {error && <div className="form-message error">{error}</div>}

            <button type="submit" className="submit-button" disabled={loading || token.length < 6}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="login-footer">
              <button type="button" className="toggle-mode" onClick={() => setStep('email')}>
                ← Change email
              </button>
              <button type="button" className="toggle-mode" onClick={handleResend}>
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
