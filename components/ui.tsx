import type { BookingStatus } from '@/lib/types';

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  photo_submitted: 'bg-purple-100 text-purple-700',
  disputed: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
  refunded: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  photo_submitted: 'Awaiting approval',
  disputed: 'Disputed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function StarRating({
  rating,
  count,
}: {
  rating: number;
  count?: number;
}) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-500" aria-hidden>
        {'★'.repeat(rounded)}
        {'☆'.repeat(5 - rounded)}
      </span>
      <span className="text-slate-600">
        {rating ? rating.toFixed(1) : 'New'}
        {count != null ? ` (${count})` : ''}
      </span>
    </span>
  );
}

export function ServiceBadges({ services }: { services: string[] | null }) {
  if (!services?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {services.map((s) => (
        <span key={s} className="badge bg-brand-50 capitalize text-brand-700">
          {s}
        </span>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
