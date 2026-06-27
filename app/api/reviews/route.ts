import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionProfile } from '@/lib/auth';

/**
 * POST /api/reviews
 * Submit a review for a completed booking. Recomputes the reviewee's average
 * rating. Reviews are only allowed once the booking status is `completed`.
 */
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bookingId, rating, comment } = await req.json();
  if (!bookingId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Valid bookingId and rating (1-5) required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.status !== 'completed') {
    return NextResponse.json(
      { error: 'You can only review completed bookings.' },
      { status: 409 }
    );
  }
  if (booking.host_id !== session.userId && booking.cleaner_id !== session.userId) {
    return NextResponse.json({ error: 'Not your booking' }, { status: 403 });
  }

  // Reviewee is the other party on the booking.
  const revieweeId =
    booking.host_id === session.userId ? booking.cleaner_id : booking.host_id;

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      booking_id: bookingId,
      reviewer_id: session.userId,
      reviewee_id: revieweeId,
      rating,
      comment: comment ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Recompute the cleaner's average rating (only when reviewing a cleaner).
  const admin = createAdminClient();
  const { data: cleaner } = await admin
    .from('cleaner_profiles')
    .select('id')
    .eq('id', revieweeId)
    .maybeSingle();

  if (cleaner) {
    const { data: all } = await admin
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', revieweeId);
    if (all?.length) {
      const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
      await admin
        .from('cleaner_profiles')
        .update({ average_rating: Math.round(avg * 100) / 100 })
        .eq('id', revieweeId);
    }
  }

  return NextResponse.json({ review });
}
