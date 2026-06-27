import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionProfile } from '@/lib/auth';
import { notify } from '@/lib/notifications';

const DISPUTE_WINDOW_HOURS = 24;

/**
 * POST /api/bookings/[id]/proof
 * Cleaner submits before/after photo proof (already uploaded to Storage).
 * Requires >= 2 before and >= 2 after photos. Sets status `photo_submitted`,
 * records the 24-hour dispute window, and notifies the host.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { beforePhotos, afterPhotos } = await req.json();

  if (!Array.isArray(beforePhotos) || beforePhotos.length < 2) {
    return NextResponse.json({ error: 'At least 2 before photos required.' }, { status: 400 });
  }
  if (!Array.isArray(afterPhotos) || afterPhotos.length < 2) {
    return NextResponse.json({ error: 'At least 2 after photos required.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!booking || booking.cleaner_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!['in_progress', 'confirmed'].includes(booking.status)) {
    return NextResponse.json(
      { error: 'Job is not in a state where proof can be submitted.' },
      { status: 409 }
    );
  }

  const submittedAt = new Date();
  const windowEnds = new Date(submittedAt.getTime() + DISPUTE_WINDOW_HOURS * 3600 * 1000);

  const { error: proofErr } = await supabase.from('cleaning_proofs').insert({
    booking_id: booking.id,
    before_photos: beforePhotos,
    after_photos: afterPhotos,
    submitted_at: submittedAt.toISOString(),
    dispute_window_ends_at: windowEnds.toISOString(),
  });
  if (proofErr) return NextResponse.json({ error: proofErr.message }, { status: 400 });

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'photo_submitted' })
    .eq('id', booking.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const admin = createAdminClient();
  await notify(admin, {
    userId: booking.host_id,
    type: 'proof_submitted',
    message: 'Your cleaner submitted photo proof. Review within 24 hours or funds auto-release.',
    bookingId: booking.id,
  });

  return NextResponse.json({ booking: updated, disputeWindowEndsAt: windowEnds.toISOString() });
}
