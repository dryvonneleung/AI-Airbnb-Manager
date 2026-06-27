'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Role } from '@/lib/types';

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (active) setRole((data?.role as Role) ?? null);
      } else {
        setRole(null);
      }
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const dashboardHref =
    role === 'cleaner' ? '/dashboard/cleaner' : '/dashboard/host';

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
          <span className="text-xl">🧽</span>
          <span className="text-lg">Cleanrus</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/search" className="text-slate-600 hover:text-slate-900">
            Find a cleaner
          </Link>
          {email ? (
            <>
              <Link href={dashboardHref} className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <button onClick={signOut} className="btn-secondary">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
