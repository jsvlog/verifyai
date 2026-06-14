import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Lemon Squeezy webhook handler
// Receives order_created, subscription_created, etc.
export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('x-signature') || ''

  // In production, verify the signature:
  // if (!verifyWebhookSignature(payload, signature)) {
  //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  // }

  try {
    const event = JSON.parse(payload)
    const eventName = event.meta?.event_name

    if (eventName === 'order_created' || eventName === 'order_paid') {
      const purchaseId = event.data.id
      const userId = event.data.attributes.user_email // We'll match by email
      const variantName = event.data.attributes.variant_name || ''
      const userName = event.data.attributes.user_name || ''

      // Determine plan from variant name
      let plan: '2-week' | '4-week' | '12-week' = '4-week'
      if (variantName.includes('2-Week') || variantName.includes('2-week')) plan = '2-week'
      else if (variantName.includes('12-Week') || variantName.includes('12-week')) plan = '12-week'

      // Calculate expiry
      const weeks = plan === '2-week' ? 2 : plan === '4-week' ? 4 : 12
      const expiresAt = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000)

      // Find user by email
      if (userId) {
        const supabase = await createClient()

        // Get user by email from auth
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
        const matchedUser = users?.find((u: any) => u.email === userId)

        if (matchedUser) {
          // Insert subscription
          await supabase.from('subscriptions').insert({
            user_id: matchedUser.id,
            plan,
            status: 'active',
            lemon_squeezy_purchase_id: purchaseId,
            lemon_squeezy_variant_id: event.data.attributes.variant_id,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
