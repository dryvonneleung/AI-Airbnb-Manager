'use client';

import { useEffect, useState } from 'react';
import type { Notification } from '@/lib/types';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setItems(data.notifications ?? []);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  async function markAll() {
    await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({}) });
    setItems((cur) => cur.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) markAll();
        }}
        className="relative rounded-full border border-slate-200 bg-white p-2 hover:bg-slate-50"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {items.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">No notifications.</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className={`rounded-lg p-3 text-sm ${n.is_read ? 'text-slate-500' : 'bg-brand-50 text-slate-800'}`}>
                  {n.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
