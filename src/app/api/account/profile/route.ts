import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { full_name } = body

    // Update auth metadata
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { user_metadata: { ...user.user_metadata, full_name } }
    )

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    // Update profiles table
    await adminClient.from('profiles').upsert({
      id: user.id,
      full_name,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
