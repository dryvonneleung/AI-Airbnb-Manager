import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { haversineKm } from '@/lib/geo';

/**
 * GET /api/cleaners
 * Lists available cleaners for the directory/map. Supports optional filters:
 *   ?lat=&lng=          caller location (results get distanceKm + sorted)
 *   ?services=a,b       must offer all listed services
 *   ?maxRate=           max hourly rate
 *   ?minRating=         minimum average rating
 *   ?available=true     only cleaners flagged available
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const services = searchParams.get('services')?.split(',').filter(Boolean) ?? [];
  const maxRate = parseFloat(searchParams.get('maxRate') ?? '');
  const minRating = parseFloat(searchParams.get('minRating') ?? '');
  const availableOnly = searchParams.get('available') === 'true';

  const admin = createAdminClient();
  let query = admin
    .from('cleaner_profiles')
    .select('*, profile:profiles!cleaner_profiles_id_fkey(*)')
    .not('latitude', 'is', null);

  if (availableOnly) query = query.eq('is_available', true);
  if (!Number.isNaN(maxRate)) query = query.lte('hourly_rate', maxRate);
  if (!Number.isNaN(minRating)) query = query.gte('average_rating', minRating);
  if (services.length) query = query.contains('services', services);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let cleaners = (data ?? []).map((c: any) => {
    const distanceKm =
      !Number.isNaN(lat) && !Number.isNaN(lng) && c.latitude != null
        ? haversineKm(lat, lng, c.latitude, c.longitude)
        : undefined;
    return { ...c, distanceKm };
  });

  // Sort by distance when caller location is known, else by rating.
  cleaners.sort((a: any, b: any) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return b.average_rating - a.average_rating;
  });

  return NextResponse.json({ cleaners });
}
