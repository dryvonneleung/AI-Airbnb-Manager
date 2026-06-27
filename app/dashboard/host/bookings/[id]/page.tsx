import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui';
import { BookingTimeline, PhotoGrid } from '@/components/BookingTimeline';
import { BookingActions } from '@/components/host/BookingActions';
import { ReviewForm } from '@/components/ReviewForm';
import { formatCurrency } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function HostBookingDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: booking } = await supabase
    .from('bookings')
    .select(
      '*, cleaner:profiles!bookings_cleaner_id_fkey(full_name, phone, email), property:properties(name, address)'
    )
    .eq('id', params.id)
    .single();

  if (!booking || booking.host_id !== user.id) notFound();

  const { data: proof } = await supabase
    .from('cleaning_proofs')
    .select('*')
    .eq('booking_id', params.id)
    .maybeSingle();

  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', params.id)
    .maybeSingle();

  const cleaner: any = (booking as any).cleaner;
  const property: any = (booking as any).property;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard/host" className="text-sm text-brand-700">&larr; Back to dashboard</Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Booking detail</h1>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Status</h2>
          <div className="mt-3">
            <BookingTimeline status={booking.status} />
          </div>
        </div>
        <div className="card space-y-2 text-sm">
          <h2 className="font-semibold">Details</h2>
          <p><span className="text-slate-500">Cleaner:</span> {cleaner?.full_name}</p>
          <p><span className="text-slate-500">Contact:</span> {cleaner?.phone ?? cleaner?.email ?? '—'}</p>
          <p><span className="text-slate-500">Property:</span> {property?.name} — {property?.address}</p>
          <p><span className="text-slate-500">Scheduled:</span> {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : '—'}</p>
          <p><span className="text-slate-500">Duration:</span> {booking.duration_hours}h</p>
          <p><span className="text-slate-500">Services:</span> {(booking.services_requested ?? []).join(', ') || '—'}</p>
          <p><span className="text-slate-500">Total:</span> {formatCurrency(Number(booking.amount ?? 0))}</p>
          {booking.special_instructions && (
            <p><span className="text-slate-500">Instructions:</span> {booking.special_instructions}</p>
          )}
        </div>
      </div>

      {/* Proof photos */}
      {proof && (
        <div className="card mt-6 space-y-4">
          <h2 className="font-semibold">Photo proof</h2>
          <PhotoGrid title="Before" photos={proof.before_photos ?? []} />
          <PhotoGrid title="After" photos={proof.after_photos ?? []} />
          {proof.dispute_window_ends_at && booking.status === 'photo_submitted' && (
            <p className="text-sm text-amber-600">
              Auto-releases on {new Date(proof.dispute_window_ends_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Approve / dispute */}
      <div className="mt-6">
        <BookingActions bookingId={booking.id} status={booking.status} />
      </div>

      {/* Review prompt */}
      {booking.status === 'completed' && !existingReview && (
        <div className="mt-6">
          <ReviewForm bookingId={booking.id} />
        </div>
      )}

      {booking.status === 'disputed' && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          This booking is under dispute review. Reason: {booking.dispute_reason}
        </div>
      )}
    </div>
  );
}
