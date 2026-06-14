import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Admin client — bypasses RLS for database writes
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Verify the Lemon Squeezy webhook signature
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

function parsePlanFromVariant(variantName: string): '2-week' | '4-week' | '12-week' {
  const lower = variantName.toLowerCase()
  if (lower.includes('2-week') || lower.includes('2w')) return '2-week'
  if (lower.includes('12-week') || lower.includes('12w')) return '12-week'
  return '4-week' // default
}

function weeksFromPlan(plan: '2-week' | '4-week' | '12-week'): number {
  if (plan === '2-week') return 2
  if (plan === '12-week') return 12
  return 4
}

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('x-signature') || ''

  // Verify webhook signature in production
  if (process.env.NODE_ENV === 'production' && !verifySignature(payload, signature)) {
    console.error('Webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const event = JSON.parse(payload)
    const eventName = event.meta?.event_name
    const attributes = event.data?.attributes || {}
    const customData = attributes.custom_data || event.meta?.custom_data || {}

    console.log(`Webhook received: ${eventName}`)

    switch (eventName) {
      case 'order_created':
      case 'order_paid': {
        const purchaseId = event.data.id
        const userEmail = attributes.user_email || customData.user_id
        const variantName = attributes.variant_name || ''
        const variantId = attributes.variant_id?.toString() || ''
        const plan = parsePlanFromVariant(variantName)
        const weeks = weeksFromPlan(plan)
        const expiresAt = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000)

        // Find user by either email or custom user_id
        let matchedUserId: string | null = null

        if (customData.user_id) {
          // Check if user exists with this ID
          const { data: profile } = await adminClient
            .from('profiles')
            .select('id')
            .eq('id', customData.user_id)
            .maybeSingle()
          if (profile) matchedUserId = customData.user_id
        }

        if (!matchedUserId && userEmail) {
          // Look up user by email via auth admin API
          const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
          if (!listError && users) {
            const matched = users.find((u: any) =>
              u.email?.toLowerCase() === userEmail.toLowerCase()
            )
            if (matched) matchedUserId = matched.id
          }
        }

        if (matchedUserId) {
          // Upsert subscription (update if exists, insert if new)
          const { error: upsertError } = await adminClient
            .from('subscriptions')
            .upsert({
              user_id: matchedUserId,
              plan,
              status: 'active',
              lemon_squeezy_purchase_id: purchaseId,
              lemon_squeezy_variant_id: variantId,
              started_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
            }, {
              onConflict: 'lemon_squeezy_purchase_id',
            })

          if (upsertError) {
            console.error('Webhook: subscription upsert failed', upsertError)
          } else {
            console.log(`Webhook: subscription ${plan} activated for user ${matchedUserId}`)
          }
        } else {
          console.log(`Webhook: no user found for email ${userEmail} or custom_id ${customData.user_id}`)
        }
        break
      }

      case 'subscription_updated':
      case 'subscription_cancelled':
      case 'subscription_expired': {
        const purchaseId = attributes.order_id || event.data.id
        if (purchaseId) {
          const newStatus = eventName === 'subscription_expired' ? 'expired' : 'cancelled'
          const { error: updateError } = await adminClient
            .from('subscriptions')
            .update({ status: newStatus })
            .eq('lemon_squeezy_purchase_id', purchaseId)

          if (updateError) {
            console.error('Webhook: subscription update failed', updateError)
          } else {
            console.log(`Webhook: subscription ${purchaseId} → ${newStatus}`)
          }
        }
        break
      }

      case 'subscription_payment_success':
      case 'subscription_payment_recovered': {
        // Reactivate subscription if payment succeeded
        const purchaseId = attributes.order_id || event.data.id
        if (purchaseId) {
          await adminClient
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('lemon_squeezy_purchase_id', purchaseId)
        }
        break
      }

      default:
        console.log(`Webhook: unhandled event ${eventName}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
