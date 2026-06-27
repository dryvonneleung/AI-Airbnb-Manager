import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocode } from '@/lib/geo';

/**
 * POST /api/auth/signup
 * Creates the Supabase auth user (email auto-confirmed for the MVP), the
 * profile row, and role-specific records (cleaner_profiles or a first
 * property). The client then signs in to establish the session cookie.
 */
export async function POST(req: Request) {
  const admin = createAdminClient();
  const body = await req.json();
  const {
    role,
    fullName,
    email,
    password,
    phone,
    airbnbUrl,
    address,
    hourlyRate,
    travelRadius,
    services,
  } = body;

  if (!role || !['host', 'cleaner'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  // 1. Create the auth user.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message || 'Could not create user' },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  // For hosts the MVP treats a submitted Airbnb URL as the verification gate;
  // we still generate a postcard-style code they can confirm later.
  const verificationCode =
    role === 'host'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : null;

  // 2. Upsert the profile (the auth trigger may have created a stub row).
  const { error: profileErr } = await admin.from('profiles').upsert({
    id: userId,
    role,
    full_name: fullName,
    email,
    phone,
    airbnb_listing_url: role === 'host' ? airbnbUrl : null,
    verification_code: verificationCode,
    verification_code_sent_at: verificationCode ? new Date().toISOString() : null,
    is_verified: false,
  });
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }

  // 3. Role-specific records (geocode the address via Nominatim).
  let coords: { lat: number; lon: number } | null = null;
  if (address) {
    const g = await geocode(address).catch(() => null);
    if (g) coords = { lat: g.lat, lon: g.lon };
  }

  if (role === 'cleaner') {
    const { error: cpErr } = await admin.from('cleaner_profiles').upsert({
      id: userId,
      hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      travel_radius_km: travelRadius ? Number(travelRadius) : 20,
      address,
      latitude: coords?.lat ?? null,
      longitude: coords?.lon ?? null,
      services: services?.length ? services : ['cleaning'],
      cancellation_policy: 'moderate',
      is_available: true,
    });
    if (cpErr) {
      return NextResponse.json({ error: cpErr.message }, { status: 400 });
    }
  } else if (role === 'host' && address) {
    await admin.from('properties').insert({
      host_id: userId,
      name: 'My property',
      address,
      airbnb_url: airbnbUrl,
      latitude: coords?.lat ?? null,
      longitude: coords?.lon ?? null,
    });
  }

  return NextResponse.json({ ok: true, userId });
}
