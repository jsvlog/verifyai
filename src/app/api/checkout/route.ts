import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckout, PLAN_VARIANTS } from '@/lib/lemon-squeezy'

export async function GET(request: NextRequest) {
  const planName = request.nextUrl.searchParams.get('plan')
  if (!planName || !PLAN_VARIANTS[planName]) {
    return NextResponse.redirect(new URL('/pricing', request.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const checkoutUrl = await createCheckout({
      variantId: PLAN_VARIANTS[planName],
      email: user?.email,
      userId: user?.id,
      successUrl: `${request.nextUrl.origin}/dashboard?purchase=success`,
    })

    return NextResponse.redirect(checkoutUrl)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Checkout error:', msg)
    return NextResponse.redirect(new URL(`/pricing?error=${encodeURIComponent(msg)}`, request.url))
  }
}
