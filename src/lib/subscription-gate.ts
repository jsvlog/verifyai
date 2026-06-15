// Subscription gating & free-tier enforcement
// - Registered users: check Supabase subscriptions table (server-side only)
// - Unregistered users: track scans in localStorage (5 free, then signup wall)
// - Humanizer + Plagiarism: paid users only
//
// IMPORTANT: This file is imported by BOTH server and client components.
// The Supabase client must NOT be created at module level — it would crash
// in the browser where SUPABASE_SERVICE_ROLE_KEY is not available.

import { createClient } from '@supabase/supabase-js';

let _adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _adminClient;
}

const FREE_SCAN_LIMIT = 5;
const LS_KEY = 'verifyai_free_scans';

// ================================================================
//  SERVER-SIDE: Subscription check
// ================================================================

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const client = getAdminClient();
    const { data: sub } = await client
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

  try {
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
  } catch {
    // localStorage might be blocked in some contexts
    return { used: 0, limit: FREE_SCAN_LIMIT, remaining: FREE_SCAN_LIMIT, blocked: false };
  }
}

export function useFreeScan(): FreeScanState {
  const current = getFreeScanState();

  if (!current.blocked) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const data = raw ? JSON.parse(raw) : { count: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000 };
      data.count++;
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch { /* localStorage unavailable */ }
  }

  return getFreeScanState();
}

export function resetFreeScans(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(LS_KEY); } catch {}
}
