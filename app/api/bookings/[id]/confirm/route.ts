import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionProfile } from '@/lib/auth';
import { notify } from '@/lib/notifications';

/**
 * POST /api/bookings/[id]/confirm
 * Called after the host's card payment is authorized (funds held). Moves the
 * booking from `pending` to `confirmed`.
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
  if (booking.status !== 'pending') {
    return NextResponse.json({ booking }); // idempotent
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const admin = createAdminClient();
  await notify(admin, {
    userId: booking.cleaner_id,
    type: 'booking_confirmed',
    message: 'A booking has been paid and confirmed. Funds are held in escrow.',
    bookingId: booking.id,
  });

  return NextResponse.json({ booking: updated });
}
