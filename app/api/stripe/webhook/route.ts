import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// Stripe needs the raw body to verify the signature.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 * Handles Stripe events. Keeps booking state in sync with payment lifecycle
 * and tracks Connect account readiness.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    if (!sig || !secret) throw new Error('Missing signature/secret');
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  switch (event.type) {
    // Funds authorized & held (manual capture) → booking confirmed.
    case 'payment_intent.amount_capturable_updated': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await admin
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('stripe_payment_intent_id', pi.id)
        .eq('status', 'pending');
      break;
    }

    // Funds captured → booking completed (backstop for approve/auto-release).
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await admin
        .from('bookings')
        .update({ status: 'completed', funds_released_at: new Date().toISOString() })
        .eq('stripe_payment_intent_id', pi.id)
        .in('status', ['photo_submitted', 'confirmed']);
      break;
    }

    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await admin
        .from('bookings')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', pi.id);
      break;
    }

    // Connect account finished onboarding & is payout-ready.
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled && account.payouts_enabled) {
        await admin
          .from('profiles')
          .update({ is_verified: true })
          .eq('stripe_account_id', account.id);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
