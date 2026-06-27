import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge, StarRating } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { ConnectStripeButton } from '@/components/cleaner/ConnectStripeButton';
import { formatCurrency } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function CleanerDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: cleaner } = await supabase
    .from('cleaner_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, property:properties(name, address), host:profiles!bookings_host_id_fkey(full_name)')
    .eq('cleaner_id', user.id)
    .order('scheduled_at', { ascending: true });

  const all = bookings ?? [];
  const upcoming = all.filter((b) => ['confirmed', 'in_progress', 'photo_submitted'].includes(b.status));

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekEarnings = all
    .filter((b) => b.status === 'completed' && b.funds_released_at && new Date(b.funds_released_at) >= weekAgo)
    .reduce((s, b) => s + Number(b.cleaner_payout ?? 0), 0);
  const allTimeEarnings = all
    .filter((b) => b.status === 'completed')
    .reduce((s, b) => s + Number(b.cleaner_payout ?? 0), 0);

  // Profile completion heuristic
  const checks = [
    !!cleaner?.bio,
    !!cleaner?.hourly_rate,
    !!cleaner?.latitude,
    !!profile?.stripe_account_id,
    !!(cleaner?.services?.length),
  ];
  const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cleaner dashboard</h1>
          <p className="text-sm text-slate-500">Welcome, {profile?.full_name ?? 'cleaner'}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link href="/dashboard/cleaner/profile" className="btn-secondary">Edit profile</Link>
        </div>
      </div>

      {/* Stripe connect gate */}
      {!profile?.stripe_account_id && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800">Connect your payout account</p>
          <p className="mt-1 text-sm text-amber-700">
            You can&apos;t receive bookings until you connect a Stripe payout account.
          </p>
          <div className="mt-3">
            <ConnectStripeButton connected={false} />
          </div>
        </div>
      )}

      {/* Overview */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming jobs" value={String(upcoming.length)} />
        <Stat label="This week" value={formatCurrency(weekEarnings)} />
        <Stat label="Average rating" value={cleaner?.average_rating ? Number(cleaner.average_rating).toFixed(1) : 'New'} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card sm:col-span-2">
          <p className="text-sm text-slate-500">Profile completion</p>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-brand-600" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{completion}% complete</p>
        </div>
        <div className="card flex items-center justify-between">
          <span className="text-sm text-slate-500">Payouts</span>
          <ConnectStripeButton connected={!!profile?.stripe_account_id} />
        </div>
      </div>

      {/* Jobs */}
      <h2 className="mt-8 text-lg font-semibold">Upcoming jobs</h2>
      <div className="mt-3 space-y-2">
        {upcoming.length === 0 && <p className="text-sm text-slate-500">No upcoming jobs.</p>}
        {upcoming.map((b: any) => (
          <Link key={b.id} href={`/dashboard/cleaner/jobs/${b.id}`}
            className="card flex items-center justify-between hover:shadow-md">
            <div>
              <p className="font-medium">{b.property?.name ?? 'Property'} · {b.host?.full_name ?? 'Host'}</p>
              <p className="text-sm text-slate-500">
                {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : 'Unscheduled'} · payout {formatCurrency(Number(b.cleaner_payout ?? 0))}
              </p>
            </div>
            <StatusBadge status={b.status} />
          </Link>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Earnings</h2>
        <Link href="/dashboard/cleaner/earnings" className="text-sm text-brand-700">View all &rarr;</Link>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Stat label="All-time earnings" value={formatCurrency(allTimeEarnings)} />
        <div className="card flex items-center justify-between">
          <span className="text-sm text-slate-500">Your rating</span>
          <StarRating rating={Number(cleaner?.average_rating ?? 0)} count={cleaner?.total_jobs ?? 0} />
        </div>
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
