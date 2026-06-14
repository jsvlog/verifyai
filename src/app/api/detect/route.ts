import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectAI } from '@/lib/detection'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkScanLimit } from '@/lib/scan-limits'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Please provide text.', requestId: genId() }, { status: 400 })
    }
    if (text.length > 25000) {
      return NextResponse.json({ success: false, error: 'Text exceeds limit.', requestId: genId() }, { status: 400 })
    }

    // Auth check + scan limit
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const limit = await checkScanLimit(user.id)
      if (!limit.allowed) {
        return NextResponse.json({
          success: false,
          error: `Free tier limit reached (${limit.used}/${limit.limit} scans this week). Upgrade to continue.`,
          requestId: genId(),
          code: 'SCAN_LIMIT_REACHED',
        }, { status: 429 })
      }
    }

    const result = await detectAI(text.trim())

    // Save scan if user is logged in
    if (user) {
      await adminClient.from('scans').insert({
        user_id: user.id,
        type: 'ai-detection',
        input_text: text.trim(),
        input_length: text.length,
        result,
        processing_time: result.processingTime,
      })
    }

    return NextResponse.json({ success: true, data: result, requestId: genId() })
  } catch (error) {
    console.error('Detection API error:', error)
    return NextResponse.json({ success: false, error: 'Internal error', requestId: genId() }, { status: 500 })
  }
}

function genId() { return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}` }
