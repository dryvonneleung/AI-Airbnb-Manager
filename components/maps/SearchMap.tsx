'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import Link from 'next/link';
import { cleanerIcon } from './icon';
import { StarRating } from '@/components/ui';
import { formatCurrency } from '@/lib/pricing';
import type { CleanerWithProfile } from '@/lib/types';

export interface MapCleaner extends CleanerWithProfile {
  distanceKm?: number;
}

function FitBounds({ cleaners, center }: { cleaners: MapCleaner[]; center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const pts = cleaners
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => [c.latitude as number, c.longitude as number] as [number, number]);
    if (pts.length) {
      map.fitBounds([...pts, center], { padding: [50, 50], maxZoom: 13 });
    } else {
      map.setView(center, 12);
    }
  }, [cleaners, center, map]);
  return null;
}

export default function SearchMap({
  cleaners,
  center,
  activeId,
}: {
  cleaners: MapCleaner[];
  center: [number, number];
  activeId?: string | null;
}) {
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds cleaners={cleaners} center={center} />

      {cleaners.map((c) => {
        if (c.latitude == null || c.longitude == null) return null;
        const pos: [number, number] = [c.latitude, c.longitude];
        const isActive = c.id === activeId;
        return (
          <div key={c.id}>
            <Marker position={pos} icon={cleanerIcon(isActive ? '#1ab27e' : '#0d9066')}>
              <Popup>
                <div className="space-y-1">
                  <p className="font-semibold">{c.profile.full_name ?? 'Cleaner'}</p>
                  <StarRating rating={c.average_rating} count={c.total_jobs} />
                  <p className="text-sm">
                    {c.hourly_rate ? `${formatCurrency(c.hourly_rate)}/hr` : 'Rate on request'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Travels up to {c.travel_radius_km} km
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Link href={`/cleaners/${c.id}`} className="text-brand-700 underline">
                      View profile
                    </Link>
                    <Link href={`/book/${c.id}`} className="text-brand-700 underline">
                      Book now
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
            {isActive && (
              <Circle
                center={pos}
                radius={c.travel_radius_km * 1000}
                pathOptions={{ color: '#1ab27e', fillOpacity: 0.08 }}
              />
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}
