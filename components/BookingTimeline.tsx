import type { BookingStatus } from '@/lib/types';

const STEPS: { key: BookingStatus; label: string }[] = [
  { key: 'confirmed', label: 'Booked & paid' },
  { key: 'in_progress', label: 'Cleaning in progress' },
  { key: 'photo_submitted', label: 'Photo proof submitted' },
  { key: 'completed', label: 'Completed & paid out' },
];

const ORDER: BookingStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'photo_submitted',
  'completed',
];

export function BookingTimeline({ status }: { status: BookingStatus }) {
  if (status === 'cancelled' || status === 'refunded') {
    return <p className="badge bg-orange-100 text-orange-700">Booking {status}</p>;
  }
  if (status === 'disputed') {
    return <p className="badge bg-red-100 text-red-700">Under dispute review</p>;
  }
  const currentIdx = ORDER.indexOf(status);

  return (
    <ol className="space-y-3">
      {STEPS.map((step) => {
        const stepIdx = ORDER.indexOf(step.key);
        const done = currentIdx >= stepIdx;
        const active = status === step.key;
        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                done ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
              } ${active ? 'ring-2 ring-brand-300' : ''}`}
            >
              {done ? '✓' : ''}
            </span>
            <span className={done ? 'font-medium' : 'text-slate-500'}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function PhotoGrid({ title, photos }: { title: string; photos: string[] }) {
  if (!photos?.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photos.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt={title} className="h-28 w-full rounded-lg object-cover" />
        ))}
      </div>
    </div>
  );
}
