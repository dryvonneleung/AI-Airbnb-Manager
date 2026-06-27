import Link from 'next/link';
import { LandingMap } from '@/components/LandingMap';

const HOST_STEPS = [
  { title: 'Find a cleaner nearby', body: 'Browse verified cleaners on the map and filter by service, rate and rating.' },
  { title: 'Book & pay securely', body: 'Your payment is held in escrow — the cleaner is not paid until the job is done.' },
  { title: 'Approve photo proof', body: 'Review before/after photos and release payment, or let it auto-release in 24h.' },
];

const CLEANER_STEPS = [
  { title: 'Create your profile', body: 'Set your rate, services, travel radius and connect a Stripe payout account.' },
  { title: 'Get booked', body: 'Hosts nearby find you on the map and book directly. Funds are secured upfront.' },
  { title: 'Get paid fast', body: 'Submit photo proof when finished and receive 82% of the booking automatically.' },
];

const TRUST = [
  { icon: '✅', title: 'Verified cleaners', body: 'Identity and insurance badges on every profile.' },
  { icon: '📸', title: 'Photo proof', body: 'Before & after photos required on every job.' },
  { icon: '🔒', title: 'Escrow protection', body: 'Funds held until you approve the work.' },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero */}
      <section className="grid items-center gap-10 py-14 md:grid-cols-2">
        <div>
          <span className="badge bg-brand-50 text-brand-700">Escrow-protected bookings</span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Spotless turnovers,<br />on autopilot.
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-600">
            Cleanrus connects short-term rental hosts with trusted professional
            cleaners. Pay securely, get photo proof, and never chase a turnover again.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/search" className="btn-primary text-base">
              Find a cleaner
            </Link>
            <Link href="/signup?role=cleaner" className="btn-secondary text-base">
              Become a cleaner
            </Link>
          </div>
        </div>
        <LandingMap />
      </section>

      {/* Trust indicators */}
      <section className="grid gap-4 py-8 sm:grid-cols-3">
        {TRUST.map((t) => (
          <div key={t.title} className="card flex items-start gap-3">
            <span className="text-2xl">{t.icon}</span>
            <div>
              <p className="font-semibold">{t.title}</p>
              <p className="text-sm text-slate-600">{t.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="grid gap-10 py-12 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">For hosts</h2>
          <ol className="mt-4 space-y-4">
            {HOST_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-slate-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="text-2xl font-bold">For cleaners</h2>
          <ol className="mt-4 space-y-4">
            {CLEANER_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-slate-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="my-12 rounded-2xl bg-brand-600 px-8 py-12 text-center text-white">
        <h2 className="text-3xl font-bold">Ready for stress-free turnovers?</h2>
        <p className="mx-auto mt-2 max-w-xl text-brand-50">
          Join Cleanrus today — hosts book in minutes, cleaners get paid fast.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/signup?role=host" className="btn bg-white text-brand-700 hover:bg-brand-50">
            I need a cleaner
          </Link>
          <Link href="/signup?role=cleaner" className="btn border border-white/40 text-white hover:bg-brand-700">
            I&apos;m a cleaner
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Cleanrus · Photo-proof escrow marketplace for rental cleaning
      </footer>
    </div>
  );
}
