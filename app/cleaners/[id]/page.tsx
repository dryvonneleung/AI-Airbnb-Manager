import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { RadiusMap } from '@/components/maps';
import { StarRating, ServiceBadges } from '@/components/ui';
import { formatCurrency } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function CleanerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();

  const { data: cleaner } = await admin
    .from('cleaner_profiles')
    .select('*, profile:profiles!cleaner_profiles_id_fkey(*)')
    .eq('id', params.id)
    .single();

  if (!cleaner) notFound();

  const { data: reviews } = await admin
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name)')
    .eq('reviewee_id', params.id)
    .order('created_at', { ascending: false });

  const profile = (cleaner as any).profile;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-3">
        {/* Main */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-3xl">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                '🧹'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{profile?.full_name ?? 'Cleaner'}</h1>
                {profile?.is_verified && (
                  <span className="badge bg-green-100 text-green-700">✓ Verified</span>
                )}
                {cleaner.has_insurance && (
                  <span className="badge bg-blue-100 text-blue-700">Insured</span>
                )}
              </div>
              <div className="mt-1">
                <StarRating rating={cleaner.average_rating} count={cleaner.total_jobs} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {cleaner.total_jobs} jobs completed
              </p>
            </div>
          </div>

          {cleaner.bio && <p className="mt-6 text-slate-700">{cleaner.bio}</p>}

          <h2 className="mt-8 text-lg font-semibold">Services</h2>
          <div className="mt-2">
            <ServiceBadges services={cleaner.services} />
          </div>

          <h2 className="mt-8 text-lg font-semibold">Travel area</h2>
          <p className="text-sm text-slate-600">
            Serves jobs within {cleaner.travel_radius_km} km of their base.
          </p>
          {cleaner.latitude != null && cleaner.longitude != null && (
            <div className="mt-3 h-64 overflow-hidden rounded-xl border border-slate-200">
              <RadiusMap
                latitude={cleaner.latitude}
                longitude={cleaner.longitude}
                radiusKm={cleaner.travel_radius_km}
              />
            </div>
          )}

          <h2 className="mt-8 text-lg font-semibold">
            Reviews ({reviews?.length ?? 0})
          </h2>
          <p className="text-xs text-slate-500">From verified bookings only.</p>
          <div className="mt-3 space-y-3">
            {reviews?.length ? (
              reviews.map((r: any) => (
                <div key={r.id} className="card">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {r.reviewer?.full_name ?? 'Host'}
                    </span>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No reviews yet.</p>
            )}
          </div>
        </div>

        {/* Booking sidebar */}
        <aside>
          <div className="card sticky top-20">
            <p className="text-2xl font-bold">
              {cleaner.hourly_rate ? formatCurrency(cleaner.hourly_rate) : '—'}
              <span className="text-base font-normal text-slate-500">/hr</span>
            </p>
            <p className="mt-1 text-sm text-slate-500 capitalize">
              {cleaner.cancellation_policy} cancellation
            </p>
            <p className="mt-1 text-sm">
              {cleaner.is_available ? (
                <span className="text-green-600">● Available for bookings</span>
              ) : (
                <span className="text-slate-400">● Not currently available</span>
              )}
            </p>
            <Link href={`/book/${cleaner.id}`} className="btn-primary mt-4 w-full">
              Book now
            </Link>
            {!profile?.stripe_account_id && (
              <p className="mt-2 text-xs text-amber-600">
                This cleaner hasn&apos;t connected payouts yet and can&apos;t accept bookings.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
