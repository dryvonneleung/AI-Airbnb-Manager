import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionProfile } from '@/lib/auth';
import { notify } from '@/lib/notifications';

/**
 * POST /api/bookings/[id]/approve
 * Host approves the work → capture the held PaymentIntent (Stripe splits 82/18
 * automatically), mark booking `completed`, release funds, bump cleaner stats.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!booking || booking.host_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (booking.status !== 'photo_submitted') {
    return NextResponse.json(
      { error: 'Nothing to approve — proof has not been submitted.' },
      { status: 409 }
    );
  }

  // Capture the funds held in escrow.
  if (booking.stripe_payment_intent_id) {
    try {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? 'Payment capture failed' },
        { status: 502 }
      );
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'completed', funds_released_at: now })
    .eq('id', booking.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const admin = createAdminClient();
  await admin
    .from('cleaning_proofs')
    .update({ approved_at: now })
    .eq('booking_id', booking.id);

  // Bump cleaner total_jobs.
  const { data: cp } = await admin
    .from('cleaner_profiles')
    .select('total_jobs')
    .eq('id', booking.cleaner_id)
    .single();
  if (cp) {
    await admin
      .from('cleaner_profiles')
      .update({ total_jobs: (cp.total_jobs ?? 0) + 1 })
      .eq('id', booking.cleaner_id);
  }

  await notify(admin, {
    userId: booking.cleaner_id,
    type: 'funds_released',
    message: 'The host approved your work — your payout has been released!',
    bookingId: booking.id,
  });

  return NextResponse.json({ booking: updated });
}
