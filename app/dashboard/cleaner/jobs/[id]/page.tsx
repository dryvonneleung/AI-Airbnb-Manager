import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui';
import { BookingTimeline, PhotoGrid } from '@/components/BookingTimeline';
import { JobWorkflow } from '@/components/cleaner/JobWorkflow';
import { formatCurrency } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function CleanerJobDetail({
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
    .select('*, property:properties(name, address, notes), host:profiles!bookings_host_id_fkey(full_name, phone)')
    .eq('id', params.id)
    .single();

  if (!booking || booking.cleaner_id !== user.id) notFound();

  const { data: proof } = await supabase
    .from('cleaning_proofs')
    .select('*')
    .eq('booking_id', params.id)
    .maybeSingle();

  const property: any = (booking as any).property;
  const host: any = (booking as any).host;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard/cleaner" className="text-sm text-brand-700">&larr; Back to dashboard</Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job detail</h1>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Progress</h2>
          <div className="mt-3"><BookingTimeline status={booking.status} /></div>
        </div>
        <div className="card space-y-2 text-sm">
          <h2 className="font-semibold">Job details</h2>
          <p><span className="text-slate-500">Property:</span> {property?.name}</p>
          <p><span className="text-slate-500">Address:</span> {property?.address}</p>
          <p><span className="text-slate-500">Host:</span> {host?.full_name} ({host?.phone ?? 'no phone'})</p>
          <p><span className="text-slate-500">Scheduled:</span> {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : '—'}</p>
          <p><span className="text-slate-500">Duration:</span> {booking.duration_hours}h</p>
          <p><span className="text-slate-500">Services:</span> {(booking.services_requested ?? []).join(', ') || '—'}</p>
          <p><span className="text-slate-500">Your payout:</span> {formatCurrency(Number(booking.cleaner_payout ?? 0))}</p>
          {booking.special_instructions && (
            <p><span className="text-slate-500">Instructions:</span> {booking.special_instructions}</p>
          )}
          {property?.notes && (
            <p><span className="text-slate-500">Property notes:</span> {property.notes}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <JobWorkflow bookingId={booking.id} status={booking.status} />
      </div>

      {proof && (
        <div className="card mt-6 space-y-4">
          <h2 className="font-semibold">Submitted proof</h2>
          <PhotoGrid title="Before" photos={proof.before_photos ?? []} />
          <PhotoGrid title="After" photos={proof.after_photos ?? []} />
          {proof.dispute_window_ends_at && booking.status === 'photo_submitted' && (
            <p className="text-sm text-amber-600">
              Awaiting host approval. Auto-releases on {new Date(proof.dispute_window_ends_at).toLocaleString()}.
            </p>
          )}
        </div>
      )}

      {booking.status === 'completed' && (
        <p className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          ✓ Completed — your payout of {formatCurrency(Number(booking.cleaner_payout ?? 0))} has been released.
        </p>
      )}
    </div>
  );
}
