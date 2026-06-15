// POST /api/plagiarism — Paid feature: requires active subscription
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkPlagiarism } from '@/lib/detection';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { hasActiveSubscription } from '@/lib/subscription-gate';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Please provide text.', requestId: genId() }, { status: 400 });
    }
    if (text.length > 25000) {
      return NextResponse.json({ success: false, error: 'Text exceeds limit.', requestId: genId() }, { status: 400 });
    }

    // --- Auth & Subscription Gate ---
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Plagiarism Checker requires an account. Please sign up to continue.',
        code: 'AUTH_REQUIRED',
        requestId: genId(),
      }, { status: 401 });
    }

    const isPaid = await hasActiveSubscription(user.id);
    if (!isPaid) {
      return NextResponse.json({
        success: false,
        error: 'Plagiarism Checker is a premium feature. Upgrade your plan to unlock.',
        code: 'PREMIUM_REQUIRED',
        requestId: genId(),
      }, { status: 402 });
    }

    // --- Process ---
    const result = await checkPlagiarism(text.trim());

    // Save scan
    await adminClient.from('scans').insert({
      user_id: user.id, type: 'plagiarism', input_text: text.trim(),
      input_length: text.length, result, processing_time: result.processingTime,
    });

    return NextResponse.json({ success: true, data: result, requestId: genId() });
  } catch (error) {
    console.error('Plagiarism API error:', error);
    return NextResponse.json({ success: false, error: 'Internal error', requestId: genId() }, { status: 500 });
  }
}

function genId() { return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
