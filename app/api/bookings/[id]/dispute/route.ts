import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionProfile } from '@/lib/auth';
import { notify } from '@/lib/notifications';

/**
 * POST /api/bookings/[id]/dispute
 * Host raises a dispute within the 24-hour window → status `disputed`.
 * Funds stay held (PaymentIntent uncaptured) pending manual admin review.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reason } = await req.json();
  if (!reason?.trim()) {
    return NextResponse.json({ error: 'A dispute reason is required.' }, { status: 400 });
  }

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
      { error: 'Disputes can only be raised while awaiting approval.' },
      { status: 409 }
    );
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'disputed', dispute_reason: reason })
    .eq('id', booking.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const admin = createAdminClient();
  // Notify the cleaner and (for the MVP) record an admin notification. In
  // production this would also email ADMIN_EMAIL for manual resolution.
  await notify(admin, {
    userId: booking.cleaner_id,
    type: 'disputed',
    message: 'The host disputed this booking. Our team will review it shortly.',
    bookingId: booking.id,
  });
  console.info(
    `[DISPUTE] booking=${booking.id} admin=${process.env.ADMIN_EMAIL} reason=${reason}`
  );

  return NextResponse.json({ booking: updated });
}
