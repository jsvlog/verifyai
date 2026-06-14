import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard — VerifyAI' }

// Admin client for database operations
const getAdminClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = getAdminClient()

  // Fetch scans
  const { data: scans } = await admin
    .from('scans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch subscription
  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const activePlan = sub || null
  const hasActivePlan = activePlan && new Date(activePlan.expires_at) > new Date()

  // Calculate days remaining
  const daysRemaining = activePlan
    ? Math.max(0, Math.ceil((new Date(activePlan.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const freeScansUsed = (scans || []).filter((s: any) => {
    const d = new Date(s.created_at)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return d > weekAgo
  }).length

  const freeScanLimit = 5
  const scansRemaining = hasActivePlan ? 'Unlimited' : Math.max(0, freeScanLimit - freeScansUsed)

  return (
    <div className="gradient-hero min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10 md:py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest mb-1">Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#3d3227] tracking-tight">
              Welcome{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
            </h1>
          </div>
          <form action="/api/auth/signout" method="post">
            <button className="text-sm font-medium text-[#8c7a64] hover:text-[#ff6b6b] transition-colors">
              Sign out
            </button>
          </form>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total scans" value={(scans || []).length.toString()} icon="📊" />
          <StatCard label="This week" value={freeScansUsed.toString()} icon="📅" />
          <StatCard label="Scans remaining" value={scansRemaining.toString()} icon="🔄" />
          <StatCard
            label="Plan"
            value={hasActivePlan ? `${activePlan.plan} plan` : 'Free'}
            sub={hasActivePlan ? `${daysRemaining}d left` : `${freeScanLimit - freeScansUsed} free left`}
            icon="💎"
          />
        </div>

        {/* Plan status banner */}
        {!hasActivePlan && (
          <div className="bg-white rounded-2xl border border-[#f5e6cc] shadow-sm p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-[#3d3227]">Free tier</p>
              <p className="text-xs text-[#8c7a64]">{freeScanLimit - freeScansUsed} of {freeScanLimit} free scans remaining this week</p>
            </div>
            <Link href="/pricing" className="btn-primary text-sm !py-2 !px-5">
              Upgrade to Pro
            </Link>
          </div>
        )}

        {hasActivePlan && (
          <div className="bg-[#fff9f0] rounded-2xl border border-[#ffe3bf] shadow-sm p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-[#3d3227]">{activePlan.plan} plan active</p>
              <p className="text-xs text-[#8c7a64]">{daysRemaining} days remaining — expires {new Date(activePlan.expires_at).toLocaleDateString()}</p>
            </div>
            <Link href="/pricing" className="text-sm font-semibold text-[#ff6b6b] hover:underline">Extend plan</Link>
          </div>
        )}

        {/* Scan history */}
        <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-lg shadow-[#3d3227]/4 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f5e6cc] bg-[#fffdf7]">
            <h2 className="text-sm font-semibold text-[#3d3227]">Recent scans</h2>
          </div>

          {(!scans || scans.length === 0) ? (
            <div className="p-10 text-center">
              <p className="text-[#b8a88e] text-sm mb-3">No scans yet</p>
              <Link href="/" className="btn-primary text-sm !py-2 !px-5 inline-flex">
                Run your first scan
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#f5e6cc]">
              {scans.map((scan: any) => (
                <div key={scan.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#fffdf7] transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      scan.type === 'ai-detection' ? 'bg-[#fff5f5] text-[#ff6b6b]' :
                      scan.type === 'plagiarism' ? 'bg-[#fff9f0] text-[#ffa94d]' :
                      'bg-[#ebfbee] text-[#40c057]'
                    }`}>
                      {scan.type === 'ai-detection' ? 'AI Detect' : scan.type === 'plagiarism' ? 'Plagiarism' : 'Humanizer'}
                    </span>
                    <p className="text-sm text-[#3d3227] truncate max-w-md">
                      {scan.input_text?.substring(0, 80)}{scan.input_text?.length > 80 ? '...' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {scan.result?.overallScore !== undefined && (
                      <span className="text-sm font-semibold text-[#3d3227] tabular-nums">
                        {Math.round(scan.result.overallScore)}% AI
                      </span>
                    )}
                    <span className="text-xs text-[#b8a88e]">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#f5e6cc] shadow-sm p-5">
      <div className="text-xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-[#3d3227] tracking-tight">{value}</div>
      <p className="text-xs text-[#8c7a64] mt-1">{label}</p>
      {sub && <p className="text-xs text-[#b8a88e] mt-0.5">{sub}</p>}
    </div>
  );
}
