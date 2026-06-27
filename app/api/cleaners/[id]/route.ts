import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET /api/cleaners/[id] — full cleaner profile plus reviews. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();

  const { data: cleaner, error } = await admin
    .from('cleaner_profiles')
    .select('*, profile:profiles!cleaner_profiles_id_fkey(*)')
    .eq('id', params.id)
    .single();

  if (error || !cleaner) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
  }

  const { data: reviews } = await admin
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
    .eq('reviewee_id', params.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ cleaner, reviews: reviews ?? [] });
}
