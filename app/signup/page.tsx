'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SERVICE_TYPES, type Role } from '@/lib/types';

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [role, setRole] = useState<Role | null>((params.get('role') as Role) || null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    airbnbUrl: '',
    address: '',
    hourlyRate: '35',
    travelRadius: 20,
    services: ['cleaning'] as string[],
    agree: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleService(s: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(s)
        ? f.services.filter((x) => x !== s)
        : [...f.services, s],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) return setError('Please choose a role.');
    if (!form.agree) return setError('Please accept the terms of service.');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      // Sign the user in client-side so the session cookie is set.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInError) throw signInError;

      router.push(role === 'cleaner' ? '/dashboard/cleaner' : '/dashboard/host');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Create your Cleanrus account</h1>

      {/* Role selection */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole('host')}
          className={`card text-left transition ${role === 'host' ? 'ring-2 ring-brand-500' : ''}`}
        >
          <p className="text-lg">🏠</p>
          <p className="font-semibold">I need cleaners</p>
          <p className="text-sm text-slate-600">I host short-term rentals</p>
        </button>
        <button
          type="button"
          onClick={() => setRole('cleaner')}
          className={`card text-left transition ${role === 'cleaner' ? 'ring-2 ring-brand-500' : ''}`}
        >
          <p className="text-lg">🧹</p>
          <p className="font-semibold">I&apos;m a cleaner</p>
          <p className="text-sm text-slate-600">I offer cleaning services</p>
        </button>
      </div>

      {role && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email}
                onChange={(e) => update('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone}
                onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={6} value={form.password}
              onChange={(e) => update('password', e.target.value)} />
          </div>

          {role === 'host' && (
            <>
              <div>
                <label className="label">Airbnb listing URL</label>
                <input className="input" placeholder="https://airbnb.com/rooms/..."
                  value={form.airbnbUrl} onChange={(e) => update('airbnbUrl', e.target.value)} />
              </div>
              <div>
                <label className="label">Property address</label>
                <input className="input" value={form.address}
                  onChange={(e) => update('address', e.target.value)} />
              </div>
            </>
          )}

          {role === 'cleaner' && (
            <>
              <div>
                <label className="label">Your address (used to place you on the map)</label>
                <input className="input" required value={form.address}
                  onChange={(e) => update('address', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Hourly rate ($)</label>
                  <input className="input" type="number" min={1} step="0.5" value={form.hourlyRate}
                    onChange={(e) => update('hourlyRate', e.target.value)} />
                </div>
                <div>
                  <label className="label">Travel radius: {form.travelRadius} km</label>
                  <input type="range" min={1} max={100} value={form.travelRadius}
                    onChange={(e) => update('travelRadius', Number(e.target.value))}
                    className="w-full accent-brand-600" />
                </div>
              </div>
              <div>
                <label className="label">Services offered</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map((s) => (
                    <button key={s} type="button" onClick={() => toggleService(s)}
                      className={`badge capitalize ${form.services.includes(s) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.agree}
              onChange={(e) => update('agree', e.target.checked)} />
            I agree to the Terms of Service and Privacy Policy
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-700 underline">Log in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
