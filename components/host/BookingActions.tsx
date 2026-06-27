'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BookingStatus } from '@/lib/types';

export function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState('');

  async function approve() {
    setLoading('approve');
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/approve`, { method: 'POST' });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) return setError(data.error);
    router.refresh();
  }

  async function dispute() {
    if (!reason.trim()) return setError('Please describe the issue.');
    setLoading('dispute');
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) return setError(data.error);
    setShowDispute(false);
    router.refresh();
  }

  if (status !== 'photo_submitted') return null;

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold">Review the work</h3>
      <p className="text-sm text-slate-600">
        Approve to release payment, or dispute within the 24-hour window. If you
        take no action, funds release automatically.
      </p>
      <div className="flex gap-3">
        <button onClick={approve} disabled={!!loading} className="btn-primary">
          {loading === 'approve' ? 'Releasing…' : 'Approve & release payment'}
        </button>
        <button onClick={() => setShowDispute((s) => !s)} className="btn-danger">
          Dispute
        </button>
      </div>
      {showDispute && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <textarea className="input" placeholder="Describe the issue…"
            value={reason} onChange={(e) => setReason(e.target.value)} />
          <button onClick={dispute} disabled={loading === 'dispute'} className="btn-danger">
            {loading === 'dispute' ? 'Submitting…' : 'Submit dispute'}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
