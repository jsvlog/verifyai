import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const FREE_SCAN_LIMIT = 5
const FREE_SCAN_WINDOW_DAYS = 1

export interface ScanLimitResult {
  allowed: boolean
  used: number
  limit: number
  hasActivePlan: boolean
}

export async function checkScanLimit(userId: string): Promise<ScanLimitResult> {
  const windowStart = new Date(Date.now() - FREE_SCAN_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Check active subscription first
  const { data: sub } = await adminClient
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const hasActivePlan = sub ? new Date(sub.expires_at) > new Date() : false
  if (hasActivePlan) return { allowed: true, used: 0, limit: Infinity, hasActivePlan: true }

  // Count free scans this week
  const { count, error } = await adminClient
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart)

  const used = count || 0
  return { allowed: used < FREE_SCAN_LIMIT, used, limit: FREE_SCAN_LIMIT, hasActivePlan: false }
}
