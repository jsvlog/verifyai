'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} className={className || 'text-sm font-medium text-[#8c7a64] hover:text-[#ff6b6b] transition-colors'}>
      Sign out
    </button>
  )
}
