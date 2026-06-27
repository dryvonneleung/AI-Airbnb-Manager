// Supabase Edge Function: auto-release escrowed funds.
//
// Runs hourly (via pg_cron, see schema.sql). For every booking still in
// `photo_submitted` whose 24-hour dispute window has elapsed without a dispute,
// it captures the held Stripe PaymentIntent (Stripe splits 82/18 automatically)
// and marks the booking `completed`.
//
// Deploy: supabase functions deploy auto-release --no-verify-jwt
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@15.5.0?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async () => {
  const nowIso = new Date().toISOString();

  // Find proofs whose dispute window has expired, for bookings still awaiting
  // host action.
  const { data: proofs, error } = await supabase
    .from('cleaning_proofs')
    .select('id, booking_id, dispute_window_ends_at, approved_at, bookings(id, status, stripe_payment_intent_id)')
    .lte('dispute_window_ends_at', nowIso)
    .is('approved_at', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const released: string[] = [];
  const errors: any[] = [];

  for (const proof of proofs ?? []) {
    const booking: any = (proof as any).bookings;
    if (!booking || booking.status !== 'photo_submitted') continue;

    try {
      if (booking.stripe_payment_intent_id) {
        await stripe.paymentIntents.capture(booking.stripe_payment_intent_id);
      }

      await supabase
        .from('bookings')
        .update({ status: 'completed', funds_released_at: nowIso })
        .eq('id', booking.id);

      await supabase
        .from('cleaning_proofs')
        .update({ approved_at: nowIso })
        .eq('id', (proof as any).id);

      // Bump cleaner total_jobs.
      const { data: b } = await supabase
        .from('bookings')
        .select('cleaner_id')
        .eq('id', booking.id)
        .single();
      if (b?.cleaner_id) {
        await supabase.rpc('increment_total_jobs', { cleaner: b.cleaner_id }).then(
          () => {},
          () => {}
        );
      }

      await supabase.from('notifications').insert({
        user_id: booking.cleaner_id,
        type: 'funds_released',
        message: 'Funds auto-released after the 24-hour dispute window.',
        booking_id: booking.id,
      });

      released.push(booking.id);
    } catch (e) {
      errors.push({ booking: booking.id, error: String(e) });
    }
  }

  return new Response(
    JSON.stringify({ released: released.length, ids: released, errors }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
