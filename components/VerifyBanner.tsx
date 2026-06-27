'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Host property-verification banner. For the MVP the postcard verification code
 * is shown on screen; in production it would be mailed to the property address.
 */
export function VerifyBanner({ code }: { code: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [entered, setEntered] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setError(null);
    if (entered.trim() !== code) {
      setError('That code is incorrect.');
      return;
    }
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ is_verified: true }).eq('id', user.id);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="font-semibold text-amber-800">Verify your property</p>
      <p className="mt-1 text-sm text-amber-700">
        Enter the verification code to unlock full booking features.
      </p>
      <p className="mt-2 rounded-lg bg-white/70 p-2 text-sm text-slate-600">
        <strong>MVP demo:</strong> your code is{' '}
        <code className="font-mono text-base">{code ?? '------'}</code>. In production
        this would be mailed to your property address by postcard.
      </p>
      <div className="mt-3 flex gap-2">
        <input className="input max-w-[160px]" placeholder="Enter code" value={entered}
          onChange={(e) => setEntered(e.target.value)} />
        <button onClick={verify} disabled={loading} className="btn-primary">
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
