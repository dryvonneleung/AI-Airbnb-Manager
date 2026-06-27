'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StripePayment } from '@/components/StripePayment';
import { Spinner } from '@/components/ui';
import { computePrice, formatCurrency } from '@/lib/pricing';
import { SERVICE_TYPES, type Property } from '@/lib/types';

const STEPS = ['Property', 'Schedule', 'Services', 'Instructions', 'Review', 'Pay'];

export default function BookingPage({ params }: { params: { cleanerId: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cleaner, setCleaner] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  // form state
  const [propertyId, setPropertyId] = useState('');
  const [newProperty, setNewProperty] = useState({ name: '', address: '', airbnbUrl: '' });
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(3);
  const [services, setServices] = useState<string[]>(['cleaning']);
  const [instructions, setInstructions] = useState('');

  // payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/cleaners/${params.cleanerId}`),
        fetch('/api/properties'),
      ]);
      const cData = await cRes.json();
      setCleaner(cData.cleaner);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProperties(pData.properties ?? []);
        if (pData.properties?.[0]) setPropertyId(pData.properties[0].id);
      }
      setLoading(false);
    }
    load();
  }, [params.cleanerId]);

  const rate = cleaner?.hourly_rate ? Number(cleaner.hourly_rate) : 0;
  const price = computePrice(rate, duration);

  function toggleService(s: string) {
    setServices((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  }

  async function addProperty() {
    setError(null);
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProperty),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setProperties((p) => [data.property, ...p]);
    setPropertyId(data.property.id);
    setNewProperty({ name: '', address: '', airbnbUrl: '' });
  }

  async function createBooking() {
    setError(null);
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerId: params.cleanerId,
        propertyId,
        scheduledAt,
        durationHours: duration,
        services,
        instructions,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setClientSecret(data.clientSecret);
    setBookingId(data.booking.id);
    setStep(5);
  }

  async function onPaid() {
    if (bookingId) {
      await fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' });
    }
    router.push('/dashboard/host?booked=1');
    router.refresh();
  }

  if (loading) return <Spinner label="Loading booking…" />;
  if (!cleaner) return <p className="p-10 text-center">Cleaner not found.</p>;

  const canProceed =
    (step === 0 && !!propertyId) ||
    (step === 1 && !!scheduledAt && duration > 0) ||
    (step === 2 && services.length > 0) ||
    step === 3 ||
    step === 4;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">
        Book {cleaner.profile?.full_name ?? 'cleaner'}
      </h1>

      {/* Stepper */}
      <ol className="mt-4 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`badge ${i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="card mt-6">
        {/* Step 1: property */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Select a property</h2>
            {properties.map((p) => (
              <label key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <input type="radio" name="prop" checked={propertyId === p.id}
                  onChange={() => setPropertyId(p.id)} />
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-sm text-slate-500">{p.address}</span>
                </span>
              </label>
            ))}
            <details className="rounded-lg border border-dashed border-slate-300 p-3">
              <summary className="cursor-pointer text-sm font-medium">+ Add a new property</summary>
              <div className="mt-3 space-y-2">
                <input className="input" placeholder="Property name"
                  value={newProperty.name} onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })} />
                <input className="input" placeholder="Address"
                  value={newProperty.address} onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })} />
                <input className="input" placeholder="Airbnb URL (optional)"
                  value={newProperty.airbnbUrl} onChange={(e) => setNewProperty({ ...newProperty, airbnbUrl: e.target.value })} />
                <button type="button" onClick={addProperty} className="btn-secondary">Save property</button>
              </div>
            </details>
          </div>
        )}

        {/* Step 2: schedule */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold">When do you need it?</h2>
            <div>
              <label className="label">Date & time</label>
              <input type="datetime-local" className="input" value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div>
              <label className="label">Estimated hours: {duration}</label>
              <input type="range" min={1} max={12} step={0.5} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-brand-600" />
            </div>
          </div>
        )}

        {/* Step 3: services */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold">What services do you need?</h2>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((s) => (
                <button key={s} type="button" onClick={() => toggleService(s)}
                  className={`badge capitalize ${services.includes(s) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: instructions */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Special instructions</h2>
            <textarea className="input min-h-[120px]" placeholder="Gate code, supplies location, pets, etc."
              value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
        )}

        {/* Step 5: review */}
        {step === 4 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Review &amp; pricing</h2>
            <dl className="space-y-1 text-sm">
              <Row label={`Cleaner rate (${formatCurrency(rate)}/hr × ${duration}h)`} value={formatCurrency(price.subtotal)} />
              <Row label="Platform convenience fee (2%)" value={formatCurrency(price.convenienceFee)} />
              <div className="my-2 border-t border-slate-200" />
              <Row label="Total" value={formatCurrency(price.total)} bold />
            </dl>
            <p className="text-xs text-slate-500">
              Funds are authorized now and held in escrow. The cleaner is paid only
              after you approve their photo proof (or automatically after 24 hours).
            </p>
          </div>
        )}

        {/* Step 6: pay */}
        {step === 5 && clientSecret && (
          <div className="space-y-4">
            <h2 className="font-semibold">Payment</h2>
            <p className="text-sm text-slate-600">Total to authorize: {formatCurrency(price.total)}</p>
            <StripePayment clientSecret={clientSecret} onSuccess={onPaid} />
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {/* Nav buttons */}
      {step < 5 && (
        <div className="mt-4 flex justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0} className="btn-secondary">
            Back
          </button>
          {step < 4 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed} className="btn-primary">
              Continue
            </button>
          ) : (
            <button onClick={createBooking} className="btn-primary">
              Proceed to payment
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-base' : 'text-slate-600'}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
