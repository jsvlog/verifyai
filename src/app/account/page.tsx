'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [resending, setResending] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      setUser(u)
      setFullName(u.user_metadata?.full_name || '')
      setLoading(false)
    }
    load()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg('')
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      })
      const data = await res.json()
      if (data.success) {
        setProfileMsg('Profile updated!')
        // Refresh user data
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) { setUser(u); setFullName(u.user_metadata?.full_name || '') }
      } else {
        setProfileMsg('Error: ' + (data.error || 'Failed'))
      }
    } catch {
      setProfileMsg('Network error')
    }
    setSavingProfile(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    setPasswordMsg('')
    setPasswordError('')
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setPasswordMsg('Password changed!')
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setPasswordError(data.error || 'Failed')
      }
    } catch {
      setPasswordError('Network error')
    }
    setChangingPassword(false)
  }

  const handleResendVerification = async () => {
    setResending(true)
    setVerifyMsg('')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await res.json()
      setVerifyMsg(data.success ? 'Verification email sent!' : (data.error || 'Failed'))
    } catch {
      setVerifyMsg('Network error')
    }
    setResending(false)
  }

  if (loading) {
    return (
      <div className="gradient-hero min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-pulse text-[#b8a88e]">Loading...</div>
      </div>
    )
  }

  const isEmailVerified = user?.email_confirmed_at || user?.identities?.[0]?.identity_data?.email_verified

  return (
    <div className="gradient-hero min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-5 py-12 md:py-20">
        <div className="mb-10">
          <p className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest mb-1">Settings</p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#3d3227] tracking-tight">Account</h1>
        </div>

        <div className="space-y-6">
          {/* Profile card */}
          <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-lg shadow-[#3d3227]/4 p-6 md:p-8">
            <h2 className="text-lg font-bold text-[#3d3227] mb-1">Profile</h2>
            <p className="text-sm text-[#b8a88e] mb-6">Update your personal information</p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Email</label>
                <input
                  type="email" value={user.email || ''} disabled
                  className="w-full px-4 py-3 text-sm border border-[#f5e6cc] rounded-xl bg-[#fffdf7] text-[#b8a88e] cursor-not-allowed"
                />
                <div className="flex items-center gap-2 mt-2">
                  {isEmailVerified ? (
                    <span className="text-xs text-[#40c057] font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#f08c00] font-semibold">Not verified</span>
                      <button
                        type="button" onClick={handleResendVerification} disabled={resending}
                        className="text-xs font-semibold text-[#ff6b6b] hover:underline"
                      >
                        {resending ? 'Sending...' : 'Resend verification'}
                      </button>
                      {verifyMsg && <span className="text-xs text-[#8c7a64]">{verifyMsg}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Full name</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all bg-white"
                  placeholder="Your name"
                />
              </div>

              {profileMsg && (
                <p className={`text-xs ${profileMsg.startsWith('Error') ? 'text-[#f03e3e]' : 'text-[#40c057]'}`}>
                  {profileMsg}
                </p>
              )}

              <button type="submit" disabled={savingProfile} className="btn-primary !py-2.5 !px-6 disabled:opacity-50">
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>

          {/* Password card */}
          <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-lg shadow-[#3d3227]/4 p-6 md:p-8">
            <h2 className="text-lg font-bold text-[#3d3227] mb-1">Password</h2>
            <p className="text-sm text-[#b8a88e] mb-6">Change your password</p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Current password</label>
                <input
                  type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all bg-white"
                  placeholder="••••••••" required minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">New password</label>
                <input
                  type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all bg-white"
                  placeholder="••••••••" required minLength={6}
                />
              </div>

              {passwordError && <p className="text-xs text-[#f03e3e]">{passwordError}</p>}
              {passwordMsg && <p className="text-xs text-[#40c057]">{passwordMsg}</p>}

              <button type="submit" disabled={changingPassword} className="btn-primary !py-2.5 !px-6 disabled:opacity-50">
                {changingPassword ? 'Changing...' : 'Change password'}
              </button>
            </form>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-3xl border border-[#ffc9c9] shadow-lg p-6 md:p-8">
            <h2 className="text-lg font-bold text-[#f03e3e] mb-1">Danger zone</h2>
            <p className="text-sm text-[#8c7a64] mb-4">
              Once you delete your account, there is no going back. All your data will be permanently removed.
            </p>
            <button className="text-sm font-semibold text-[#f03e3e] border-2 border-[#ffc9c9] hover:bg-[#fff5f5] px-5 py-2.5 rounded-xl transition-colors">
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
