'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, rating, comment }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setSubmitted(true);
    router.refresh();
  }

  if (submitted) {
    return <p className="text-sm text-green-600">Thanks for your review!</p>;
  }

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold">Leave a review</h3>
      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)}
            className={n <= rating ? 'text-amber-500' : 'text-slate-300'}>
            ★
          </button>
        ))}
      </div>
      <textarea className="input" placeholder="How was the cleaning?"
        value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={submit} disabled={loading} className="btn-primary">
        {loading ? 'Submitting…' : 'Submit review'}
      </button>
    </div>
  );
}
