'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import { cleanerIcon } from './icon';

function Recenter({ position, radiusKm }: { position: [number, number]; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position);
    // Loosely fit the zoom to the radius circle.
    const zoom = radiusKm > 40 ? 9 : radiusKm > 20 ? 10 : radiusKm > 10 ? 11 : 12;
    map.setZoom(zoom);
  }, [position, radiusKm, map]);
  return null;
}

/**
 * Single-location map that draws the travel-radius circle. Used on the cleaner
 * profile editor (live preview) and the public profile page.
 */
export default function RadiusMap({
  latitude,
  longitude,
  radiusKm,
}: {
  latitude: number;
  longitude: number;
  radiusKm: number;
}) {
  const position: [number, number] = [latitude, longitude];
  return (
    <MapContainer center={position} zoom={11} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter position={position} radiusKm={radiusKm} />
      <Marker position={position} icon={cleanerIcon()} />
      <Circle
        center={position}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#0d9066', fillOpacity: 0.1 }}
      />
    </MapContainer>
  );
}
