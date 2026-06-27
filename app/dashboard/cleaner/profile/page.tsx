'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RadiusMap } from '@/components/maps';
import { Spinner } from '@/components/ui';
import { geocode } from '@/lib/geo';
import { SERVICE_TYPES } from '@/lib/types';

export default function CleanerProfileEditor() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    bio: '',
    hourlyRate: '',
    travelRadius: 20,
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    isAvailable: true,
    hasInsurance: false,
    services: [] as string[],
    avatarUrl: '' as string | null,
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: cp } = await supabase
        .from('cleaner_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      const { data: p } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      if (cp) {
        setForm((f) => ({
          ...f,
          bio: cp.bio ?? '',
          hourlyRate: cp.hourly_rate ? String(cp.hourly_rate) : '',
          travelRadius: cp.travel_radius_km ?? 20,
          address: cp.address ?? '',
          latitude: cp.latitude,
          longitude: cp.longitude,
          isAvailable: cp.is_available,
          hasInsurance: cp.has_insurance,
          services: cp.services ?? [],
          avatarUrl: p?.avatar_url ?? '',
        }));
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleService(s: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(s)
        ? f.services.filter((x) => x !== s)
        : [...f.services, s],
    }));
  }

  async function geocodeAddress() {
    const g = await geocode(form.address);
    if (g) {
      setForm((f) => ({ ...f, latitude: g.lat, longitude: g.lon }));
      setMessage('Location updated on the map.');
    } else {
      setMessage('Could not find that address.');
    }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) return setMessage(error.message);
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setForm((f) => ({ ...f, avatarUrl: data.publicUrl }));
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    setMessage(null);

    // Geocode if address changed and no coords.
    let { latitude, longitude } = form;
    if (form.address && latitude == null) {
      const g = await geocode(form.address);
      if (g) {
        latitude = g.lat;
        longitude = g.lon;
      }
    }

    const { error: cpErr } = await supabase
      .from('cleaner_profiles')
      .update({
        bio: form.bio,
        hourly_rate: form.hourlyRate ? Number(form.hourlyRate) : null,
        travel_radius_km: form.travelRadius,
        address: form.address,
        latitude,
        longitude,
        is_available: form.isAvailable,
        has_insurance: form.hasInsurance,
        services: form.services,
      })
      .eq('id', userId);

    const { error: pErr } = await supabase
      .from('profiles')
      .update({ avatar_url: form.avatarUrl })
      .eq('id', userId);

    setSaving(false);
    setMessage(cpErr || pErr ? (cpErr?.message ?? pErr?.message ?? 'Error') : 'Profile saved!');
    if (latitude !== form.latitude) setForm((f) => ({ ...f, latitude, longitude }));
  }

  if (loading) return <Spinner label="Loading profile…" />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard/cleaner" className="text-sm text-brand-700">&larr; Back to dashboard</Link>
      <h1 className="mt-2 text-2xl font-bold">Edit your profile</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="label">Profile photo</label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl">
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.avatarUrl} alt="" className="h-16 w-16 object-cover" />
                ) : '🧹'}
              </div>
              <input type="file" accept="image/*" onChange={uploadAvatar} className="text-sm" />
            </div>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input min-h-[100px]" value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <label className="label">Hourly rate ($)</label>
            <input className="input" type="number" min={1} step="0.5" value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
          </div>
          <div>
            <label className="label">Services</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((s) => (
                <button key={s} type="button" onClick={() => toggleService(s)}
                  className={`badge capitalize ${form.services.includes(s) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isAvailable}
              onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
            Available for new bookings
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.hasInsurance}
              onChange={(e) => setForm({ ...form, hasInsurance: e.target.checked })} />
            I carry liability insurance
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Base address</label>
            <div className="flex gap-2">
              <input className="input" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <button type="button" onClick={geocodeAddress} className="btn-secondary">Locate</button>
            </div>
          </div>
          <div>
            <label className="label">Travel radius: {form.travelRadius} km</label>
            <input type="range" min={1} max={100} value={form.travelRadius}
              onChange={(e) => setForm({ ...form, travelRadius: Number(e.target.value) })}
              className="w-full accent-brand-600" />
          </div>
          <div className="h-64 overflow-hidden rounded-xl border border-slate-200">
            {form.latitude != null && form.longitude != null ? (
              <RadiusMap latitude={form.latitude} longitude={form.longitude} radiusKm={form.travelRadius} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Enter an address and click Locate to preview your area.
              </div>
            )}
          </div>
        </div>
      </div>

      {message && <p className="mt-4 text-sm text-brand-700">{message}</p>}
      <button onClick={save} disabled={saving} className="btn-primary mt-4">
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}
