import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionProfile } from '@/lib/auth';
import { computePrice, toCents } from '@/lib/pricing';
import { notify } from '@/lib/notifications';

/**
 * POST /api/bookings
 * Creates a booking (status `pending`) and a Stripe PaymentIntent with manual
 * capture so funds are authorized but held in escrow. Returns the client_secret
 * for the host to confirm payment on the booking page.
 */
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== 'host') {
    return NextResponse.json({ error: 'Hosts only' }, { status: 403 });
  }

  // Business rule: hosts must have submitted an Airbnb listing (MVP verification).
  if (!session.profile.airbnb_listing_url) {
    return NextResponse.json(
      { error: 'Add your Airbnb listing URL before booking.' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { cleanerId, propertyId, scheduledAt, durationHours, services, instructions } = body;

  if (!cleanerId || !propertyId || !scheduledAt || !durationHours) {
    return NextResponse.json({ error: 'Missing booking details' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Load cleaner + payout account.
  const { data: cleaner } = await admin
    .from('cleaner_profiles')
    .select('hourly_rate, profile:profiles!cleaner_profiles_id_fkey(stripe_account_id)')
    .eq('id', cleanerId)
    .single();

  if (!cleaner?.hourly_rate) {
    return NextResponse.json({ error: 'Cleaner unavailable' }, { status: 400 });
  }

  const cleanerStripeAccount = (cleaner as any).profile?.stripe_account_id;
  // Business rule: cleaners cannot receive bookings without an active payout account.
  if (!cleanerStripeAccount) {
    return NextResponse.json(
      { error: 'This cleaner has not connected a payout account yet.' },
      { status: 400 }
    );
  }

  const price = computePrice(Number(cleaner.hourly_rate), Number(durationHours));

  // 1. Create the PaymentIntent — manual capture holds the funds in escrow.
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(price.total),
      currency: 'usd',
      capture_method: 'manual',
      application_fee_amount: toCents(price.platformFee),
      transfer_data: { destination: cleanerStripeAccount },
      metadata: { cleanerId, hostId: session.userId, propertyId },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Could not create payment' },
      { status: 502 }
    );
  }

  // 2. Create the booking row (status pending) using the host's RLS client.
  const supabase = createClient();
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      host_id: session.userId,
      cleaner_id: cleanerId,
      property_id: propertyId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: price.total,
      platform_fee: price.platformFee,
      cleaner_payout: price.cleanerPayout,
      status: 'pending',
      scheduled_at: scheduledAt,
      duration_hours: Number(durationHours),
      services_requested: services ?? [],
      special_instructions: instructions ?? null,
    })
    .select()
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: error?.message ?? 'Booking failed' }, { status: 400 });
  }

  await notify(admin, {
    userId: cleanerId,
    type: 'booking_requested',
    message: 'You have a new booking request awaiting payment.',
    bookingId: booking.id,
  });

  return NextResponse.json({
    booking,
    clientSecret: paymentIntent.client_secret,
    breakdown: price,
  });
}
