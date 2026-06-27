'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SearchMap, type MapCleaner } from '@/components/maps';
import { StarRating, ServiceBadges, Spinner } from '@/components/ui';
import { formatCurrency } from '@/lib/pricing';
import { geocode } from '@/lib/geo';
import { SERVICE_TYPES } from '@/lib/types';

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006]; // NYC fallback

export default function SearchPage() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [cleaners, setCleaners] = useState<MapCleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filters
  const [service, setService] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [minRating, setMinRating] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');

  const fetchCleaners = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      const qs = new URLSearchParams({ lat: String(lat), lng: String(lng) });
      if (service) qs.set('services', service);
      if (maxRate) qs.set('maxRate', maxRate);
      if (minRating) qs.set('minRating', minRating);
      if (availableOnly) qs.set('available', 'true');
      const res = await fetch(`/api/cleaners?${qs.toString()}`);
      const data = await res.json();
      setCleaners(data.cleaners ?? []);
      setLoading(false);
    },
    [service, maxRate, minRating, availableOnly]
  );

  // Request geolocation on mount.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(c);
          fetchCleaners(c[0], c[1]);
        },
        () => fetchCleaners(DEFAULT_CENTER[0], DEFAULT_CENTER[1]),
        { timeout: 8000 }
      );
    } else {
      fetchCleaners(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filters change.
  useEffect(() => {
    fetchCleaners(center[0], center[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, maxRate, minRating, availableOnly]);

  async function onGeocodeSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!addressQuery.trim()) return;
    const g = await geocode(addressQuery);
    if (g) {
      const c: [number, number] = [g.lat, g.lon];
      setCenter(c);
      fetchCleaners(c[0], c[1]);
    }
  }

  const sidebar = useMemo(
    () =>
      cleaners.map((c) => (
        <button
          key={c.id}
          onMouseEnter={() => setActiveId(c.id)}
          onClick={() => setActiveId(c.id)}
          className={`block w-full text-left card transition hover:shadow-md ${
            activeId === c.id ? 'ring-2 ring-brand-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold">{c.profile.full_name ?? 'Cleaner'}</p>
            {c.profile.is_verified && (
              <span className="badge bg-green-100 text-green-700">Verified</span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <StarRating rating={c.average_rating} count={c.total_jobs} />
            <span className="font-medium">
              {c.hourly_rate ? `${formatCurrency(c.hourly_rate)}/hr` : '—'}
            </span>
          </div>
          {c.distanceKm != null && (
            <p className="mt-1 text-xs text-slate-500">
              {c.distanceKm.toFixed(1)} km away · travels {c.travel_radius_km} km
            </p>
          )}
          <div className="mt-2">
            <ServiceBadges services={c.services} />
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/cleaners/${c.id}`} className="btn-secondary flex-1 text-xs">
              View profile
            </Link>
            <Link href={`/book/${c.id}`} className="btn-primary flex-1 text-xs">
              Book now
            </Link>
          </div>
        </button>
      )),
    [cleaners, activeId]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full flex-col border-r border-slate-200 bg-slate-50 md:w-[400px]">
        <div className="space-y-3 border-b border-slate-200 p-4">
          <form onSubmit={onGeocodeSearch} className="flex gap-2">
            <input
              className="input"
              placeholder="Search a city or address…"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
            />
            <button className="btn-primary">Go</button>
          </form>
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">Any service</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
            <input className="input" type="number" placeholder="Max $/hr" value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)} />
            <select className="input" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
              <option value="">Any rating</option>
              <option value="3">3★ +</option>
              <option value="4">4★ +</option>
              <option value="4.5">4.5★ +</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)} />
              Available now
            </label>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <Spinner label="Finding cleaners…" />
          ) : cleaners.length ? (
            sidebar
          ) : (
            <p className="p-4 text-center text-sm text-slate-500">
              No cleaners found in this area yet.
            </p>
          )}
        </div>
      </aside>

      {/* Map */}
      <div className="h-[50vh] flex-1 md:h-auto">
        <SearchMap cleaners={cleaners} center={center} activeId={activeId} />
      </div>
    </div>
  );
}
