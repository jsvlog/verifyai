// Subscription gating & free-tier enforcement
// - Registered users: check Supabase subscriptions table
// - Unregistered users: track scans in localStorage (5 free, then signup wall)
// - Humanizer + Plagiarism: paid users only

import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const FREE_SCAN_LIMIT = 5;
const LS_KEY = 'verifyai_free_scans';

// ================================================================
//  SERVER-SIDE: Subscription check
// ================================================================

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return false;
    return new Date(sub.expires_at) > new Date();
  } catch {
    return false;
  }
}

// ================================================================
//  CLIENT-SIDE: Unregistered user scan tracking
// ================================================================

export interface FreeScanState {
  used: number;
  limit: number;
  remaining: number;
  blocked: boolean;
}

export function getFreeScanState(): FreeScanState {
  if (typeof window === 'undefined') return { used: 0, limit: FREE_SCAN_LIMIT, remaining: FREE_SCAN_LIMIT, blocked: false };

  const raw = localStorage.getItem(LS_KEY);
  const data = raw ? JSON.parse(raw) : { count: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000 };

  // Reset if day passed
  if (Date.now() > data.resetAt) {
    data.count = 0;
    data.resetAt = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  const remaining = Math.max(0, FREE_SCAN_LIMIT - data.count);
  return {
    used: data.count,
    limit: FREE_SCAN_LIMIT,
    remaining,
    blocked: data.count >= FREE_SCAN_LIMIT,
  };
}

export function useFreeScan(): FreeScanState {
  const current = getFreeScanState();

  if (!current.blocked) {
    const raw = localStorage.getItem(LS_KEY);
    const data = raw ? JSON.parse(raw) : { count: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000 };
    data.count++;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  return getFreeScanState();
}

export function resetFreeScans(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LS_KEY);
}
