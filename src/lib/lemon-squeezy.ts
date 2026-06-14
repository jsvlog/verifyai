// ===== Lemon Squeezy Integration =====

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY || ''
const LEMON_SQUEEZY_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID || ''
const BASE_URL = 'https://api.lemonsqueezy.com/v1'

interface CheckoutOptions {
  variantId: string
  email?: string
  userId?: string
  successUrl?: string
}

export async function createCheckout(options: CheckoutOptions) {
  const { variantId, email, userId, successUrl } = options

  const attributes: Record<string, any> = {
    product_options: {
      redirect_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
    },
    checkout_data: {
      email,
      custom: { user_id: userId },
    },
  }

  const res = await fetch(`${BASE_URL}/checkouts`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          ...attributes,
          checkout_options: {
            embed: false,
            button_color: '#ff6b6b',
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: LEMON_SQUEEZY_STORE_ID } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Lemon Squeezy checkout error: ${err}`)
  }

  const json = await res.json()
  return json.data.attributes.url as string
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!process.env.LEMON_SQUEEZY_WEBHOOK_SECRET) return false

  const crypto = require('crypto')
  const hmac = crypto.createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET)
  const digest = hmac.update(payload).digest('hex')
  return signature === digest
}

// Plan → Lemon Squeezy variant ID mapping
// Set these in .env.local after creating products in Lemon Squeezy
export const PLAN_VARIANTS: Record<string, string> = {
  '2-Week': process.env.LEMON_SQUEEZY_VARIANT_2W || '',
  '4-Week': process.env.LEMON_SQUEEZY_VARIANT_4W || '',
  '12-Week': process.env.LEMON_SQUEEZY_VARIANT_12W || '',
}
