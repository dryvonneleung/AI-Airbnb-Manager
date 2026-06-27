'use client';

import { useState } from 'react';

export function ConnectStripeButton({ connected }: { connected: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/stripe/connect', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  if (connected) {
    return (
      <span className="badge bg-green-100 text-green-700">✓ Payout account connected</span>
    );
  }

  return (
    <div>
      <button onClick={connect} disabled={loading} className="btn-primary">
        {loading ? 'Redirecting…' : 'Connect payout account'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
