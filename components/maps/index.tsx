'use client';

import dynamic from 'next/dynamic';

export type { MapCleaner } from './SearchMap';

// Leaflet only runs in the browser, so all map components are imported with
// SSR disabled. Pages/components import these wrappers, never the raw modules.

export const SearchMap = dynamic(() => import('./SearchMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-200" />,
});

export const RadiusMap = dynamic(() => import('./RadiusMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-200" />,
});
