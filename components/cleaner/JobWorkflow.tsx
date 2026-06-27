'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { BookingStatus } from '@/lib/types';

function PhotoPicker({
  label,
  photos,
  setPhotos,
  uploadFn,
}: {
  label: string;
  photos: string[];
  setPhotos: (p: string[]) => void;
  uploadFn: (file: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const f of files) {
      try {
        urls.push(await uploadFn(f));
      } catch {
        /* skip failed upload */
      }
    }
    setPhotos([...photos, ...urls]);
    setUploading(false);
  }

  return (
    <div>
      <label className="label">
        {label} ({photos.length} uploaded, min 2)
      </label>
      <input type="file" accept="image/*" multiple onChange={onChange} className="text-sm" />
      {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt="" className="h-20 w-full rounded-lg object-cover" />
        ))}
      </div>
    </div>
  );
}

export function JobWorkflow({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [before, setBefore] = useState<string[]>([]);
  const [after, setAfter] = useState<string[]>([]);

  async function upload(file: File): Promise<string> {
    const path = `${bookingId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('cleaning-proofs')
      .upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('cleaning-proofs').getPublicUrl(path);
    return data.publicUrl;
  }

  async function startJob() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/start`, { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    router.refresh();
  }

  async function submitProof() {
    if (before.length < 2 || after.length < 2) {
      return setError('Upload at least 2 before and 2 after photos.');
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beforePhotos: before, afterPhotos: after }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    router.refresh();
  }

  if (status === 'confirmed') {
    return (
      <div className="card space-y-3">
        <h3 className="font-semibold">Ready to start?</h3>
        <button onClick={startJob} disabled={loading} className="btn-primary">
          {loading ? 'Starting…' : 'Start job'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (status === 'in_progress') {
    return (
      <div className="card space-y-4">
        <h3 className="font-semibold">Submit photo proof</h3>
        <PhotoPicker label="Before photos" photos={before} setPhotos={setBefore} uploadFn={upload} />
        <PhotoPicker label="After photos" photos={after} setPhotos={setAfter} uploadFn={upload} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={submitProof} disabled={loading} className="btn-primary">
          {loading ? 'Submitting…' : 'Submit proof & request payment'}
        </button>
      </div>
    );
  }

  return null;
}
