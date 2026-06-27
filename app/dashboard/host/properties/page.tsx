'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui';
import type { Property } from '@/lib/types';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    airbnbUrl: '',
    bedrooms: '',
    bathrooms: '',
    notes: '',
  });

  async function load() {
    const res = await fetch('/api/properties');
    if (res.ok) setProperties((await res.json()).properties ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error);
    setProperties((p) => [data.property, ...p]);
    setForm({ name: '', address: '', airbnbUrl: '', bedrooms: '', bathrooms: '', notes: '' });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard/host" className="text-sm text-brand-700">&larr; Back to dashboard</Link>
      <h1 className="mt-2 text-2xl font-bold">Your properties</h1>

      <form onSubmit={add} className="card mt-6 space-y-3">
        <h2 className="font-semibold">Add a property</h2>
        <input className="input" placeholder="Property name" required
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Address" required
          value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="input" placeholder="Airbnb URL (optional)"
          value={form.airbnbUrl} onChange={(e) => setForm({ ...form, airbnbUrl: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" type="number" placeholder="Bedrooms"
            value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
          <input className="input" type="number" placeholder="Bathrooms"
            value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
        </div>
        <textarea className="input" placeholder="Notes (gate code, supplies, etc.)"
          value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add property'}
        </button>
      </form>

      <h2 className="mt-8 font-semibold">Saved properties</h2>
      {loading ? (
        <Spinner />
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {properties.map((p) => (
            <div key={p.id} className="card">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-slate-500">{p.address}</p>
              {(p.bedrooms || p.bathrooms) && (
                <p className="mt-1 text-xs text-slate-400">
                  {p.bedrooms ?? '?'} bd · {p.bathrooms ?? '?'} ba
                </p>
              )}
            </div>
          ))}
          {properties.length === 0 && <p className="text-sm text-slate-500">No properties yet.</p>}
        </div>
      )}
    </div>
  );
}
