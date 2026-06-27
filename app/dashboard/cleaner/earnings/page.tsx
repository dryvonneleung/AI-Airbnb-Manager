import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function EarningsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: completed } = await supabase
    .from('bookings')
    .select('*, property:properties(name)')
    .eq('cleaner_id', user.id)
    .eq('status', 'completed')
    .order('funds_released_at', { ascending: false });

  const rows = completed ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTotal = rows
    .filter((b) => b.funds_released_at && new Date(b.funds_released_at) >= monthStart)
    .reduce((s, b) => s + Number(b.cleaner_payout ?? 0), 0);
  const allTime = rows.reduce((s, b) => s + Number(b.cleaner_payout ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard/cleaner" className="text-sm text-brand-700">&larr; Back to dashboard</Link>
      <h1 className="mt-2 text-2xl font-bold">Earnings</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="text-sm text-slate-500">This month</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(monthTotal)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">All time</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(allTime)}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Completed bookings</h2>
        <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer"
          className="text-sm text-brand-700 underline">
          Manage payouts in Stripe &rarr;
        </a>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Property</th>
              <th className="p-3 text-right">Booking total</th>
              <th className="p-3 text-right">Your payout</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">No completed jobs yet.</td>
              </tr>
            )}
            {rows.map((b: any) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="p-3">{b.funds_released_at ? new Date(b.funds_released_at).toLocaleDateString() : '—'}</td>
                <td className="p-3">{b.property?.name ?? 'Property'}</td>
                <td className="p-3 text-right">{formatCurrency(Number(b.amount ?? 0))}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(Number(b.cleaner_payout ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
