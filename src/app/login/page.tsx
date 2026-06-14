'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setNeedsVerification(false)

    if (isSignUp) {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signUpError) {
        setError(signUpError.message)
      } else if (data.session) {
        // Email confirmation is disabled — auto sign-in
        router.push('/dashboard')
        router.refresh()
      } else {
        // Email confirmation enabled — user needs to verify
        setPendingEmail(email)
        setNeedsVerification(true)
        setMessage('Check your email for the confirmation link.')
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        // Check if error is about unverified email
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setPendingEmail(email)
          setNeedsVerification(true)
          setError('Email not confirmed. Please check your inbox or resend the verification link.')
        } else {
          setError(signInError.message)
        }
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }
    setLoading(false)
  }

  const handleResendVerification = async () => {
    setResending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Verification email resent! Check your inbox.')
      } else {
        setError(data.error || 'Failed to resend')
      }
    } catch {
      setError('Network error. Try again.')
    }
    setResending(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="gradient-hero min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden px-4 py-16">
      <div className="orb orb-amber" style={{ top: '20%', right: '-10%', width: 300, height: 300 }} />
      <div className="orb orb-coral" style={{ bottom: '10%', left: '-10%', width: 250, height: 250 }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-xl shadow-[#3d3227]/8 p-8 animate-scale-in">
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b6b] to-[#ffa94d] flex items-center justify-center shadow-md shadow-[#ff6b6b]/25 mb-6 mx-auto">
            <span className="text-white text-sm font-bold">V</span>
          </div>

          <h2 className="text-xl font-bold text-[#3d3227] text-center tracking-tight mb-1">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-[#b8a88e] text-center mb-6">
            {isSignUp ? 'Start detecting AI content' : 'Sign in to your account'}
          </p>

          {/* Mode toggle */}
          <div className="flex bg-[#fff8ec] rounded-xl p-1 mb-6">
            <button
              onClick={() => { setIsSignUp(false); setError(''); setMessage(''); setNeedsVerification(false) }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isSignUp ? 'bg-white text-[#3d3227] shadow-sm' : 'text-[#b8a88e]'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(''); setMessage(''); setNeedsVerification(false) }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isSignUp ? 'bg-white text-[#3d3227] shadow-sm' : 'text-[#b8a88e]'}`}
            >
              Sign up
            </button>
          </div>

          {/* Success message */}
          {message && (
            <div className="mb-4 p-3 bg-[#ebfbee] border border-[#b2f2bb] rounded-xl text-sm text-[#2b8a3e] text-center">
              {message}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-[#fff5f5] border border-[#ffc9c9] rounded-xl text-sm text-[#f03e3e]">
              <p className="text-center">{error}</p>
              {/* Resend verification button */}
              {needsVerification && (
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="mt-3 w-full py-2 text-xs font-semibold text-[#ff6b6b] border border-[#ffc9c9] rounded-lg hover:bg-[#ffe3e3] transition-colors disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          {/* Verification prompt (when not an error but needs verification) */}
          {needsVerification && !error && (
            <div className="mb-4 p-3 bg-[#fff9db] border border-[#ffd08a] rounded-xl text-sm text-[#5c4d3c]">
              <p className="text-center">{message}</p>
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="mt-3 w-full py-2 text-xs font-semibold text-[#f08c00] border border-[#ffd08a] rounded-lg hover:bg-[#fff0db] transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}

          {!needsVerification && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Full name</label>
                  <input
                    type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all bg-white"
                    placeholder="John Doe" required={isSignUp}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all bg-white"
                  placeholder="you@example.com" required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all bg-white"
                  placeholder="••••••••" required minLength={6}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center !py-3 disabled:opacity-50">
                {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Back to sign in from verification screen */}
          {needsVerification && (
            <button
              onClick={() => { setNeedsVerification(false); setError(''); setMessage('') }}
              className="mt-4 w-full text-center text-xs text-[#8c7a64] hover:text-[#3d3227] transition-colors"
            >
              Back to sign in
            </button>
          )}

          {!needsVerification && (
            <div className="mt-5 pt-5 border-t border-[#f5e6cc]">
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#8c7a64] border border-[#f5e6cc] rounded-xl hover:bg-[#fff8ec] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
