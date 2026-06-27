import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { VerifyBanner } from '@/components/VerifyBanner';
import { formatCurrency } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function HostDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, cleaner:profiles!bookings_cleaner_id_fkey(full_name), property:properties(name)')
    .eq('host_id', user.id)
    .order('scheduled_at', { ascending: true });

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('host_id', user.id);

  const all = bookings ?? [];
  const upcoming = all.filter((b) => ['pending', 'confirmed', 'in_progress', 'photo_submitted'].includes(b.status));
  const activeCleaners = new Set(upcoming.map((b) => b.cleaner_id)).size;
  const totalSpent = all
    .filter((b) => b.status === 'completed')
    .reduce((s, b) => s + Number(b.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Host dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {profile?.full_name ?? 'host'}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link href="/search" className="btn-primary">Book a cleaner</Link>
        </div>
      </div>

      {!profile?.is_verified && (
        <div className="mt-6">
          <VerifyBanner code={profile?.verification_code ?? null} />
        </div>
      )}

      {/* Overview cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming bookings" value={String(upcoming.length)} />
        <Stat label="Active cleaners" value={String(activeCleaners)} />
        <Stat label="Total spent" value={formatCurrency(totalSpent)} />
      </div>

      {/* Bookings */}
      <h2 className="mt-8 text-lg font-semibold">Upcoming bookings</h2>
      <div className="mt-3 space-y-2">
        {upcoming.length === 0 && (
          <p className="text-sm text-slate-500">No upcoming bookings yet.</p>
        )}
        {upcoming.map((b: any) => (
          <Link key={b.id} href={`/dashboard/host/bookings/${b.id}`}
            className="card flex items-center justify-between hover:shadow-md">
            <div>
              <p className="font-medium">{b.cleaner?.full_name ?? 'Cleaner'} · {b.property?.name ?? 'Property'}</p>
              <p className="text-sm text-slate-500">
                {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : 'Unscheduled'} · {formatCurrency(Number(b.amount ?? 0))}
              </p>
            </div>
            <StatusBadge status={b.status} />
          </Link>
        ))}
      </div>

      {/* Properties */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your properties</h2>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(properties ?? []).map((p) => (
          <div key={p.id} className="card">
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-slate-500">{p.address}</p>
          </div>
        ))}
        <Link href="/dashboard/host/properties" className="card flex items-center justify-center border-dashed text-brand-700">
          + Add property
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
