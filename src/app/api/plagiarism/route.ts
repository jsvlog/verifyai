import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkPlagiarism } from '@/lib/detection'
import { createClient as createServerClient } from '@/lib/supabase/server'

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

    const result = await checkPlagiarism(text.trim())

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await adminClient.from('scans').insert({
        user_id: user.id, type: 'plagiarism', input_text: text.trim(),
        input_length: text.length, result, processing_time: result.processingTime,
      })
    }

    return NextResponse.json({ success: true, data: result, requestId: genId() })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal error', requestId: genId() }, { status: 500 })
  }
}

function genId() { return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}` }
