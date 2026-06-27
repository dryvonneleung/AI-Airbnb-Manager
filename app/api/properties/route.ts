import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { geocode } from '@/lib/geo';

/** GET /api/properties — the host's properties. */
export async function GET() {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('host_id', session.userId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ properties: data ?? [] });
}

/** POST /api/properties — add a property (geocodes the address). */
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== 'host') {
    return NextResponse.json({ error: 'Hosts only' }, { status: 403 });
  }

  const { name, address, airbnbUrl, bedrooms, bathrooms, notes } = await req.json();
  if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

  const g = await geocode(address).catch(() => null);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('properties')
    .insert({
      host_id: session.userId,
      name: name || 'My property',
      address,
      airbnb_url: airbnbUrl ?? null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      notes: notes ?? null,
      latitude: g?.lat ?? null,
      longitude: g?.lon ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ property: data });
}
