import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl">🧽</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">We couldn&apos;t find what you were looking for.</p>
      <Link href="/" className="btn-primary mt-6">Back home</Link>
    </div>
  );
}
