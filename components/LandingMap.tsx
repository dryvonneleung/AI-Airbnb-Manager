'use client';

import { SearchMap, type MapCleaner } from '@/components/maps';

// A few illustrative sample pins for the landing-page preview. These are not
// real cleaners — the live directory lives on /search.
const SAMPLE: MapCleaner[] = [
  {
    id: 'sample-1',
    average_rating: 4.9,
    total_jobs: 132,
    hourly_rate: 35,
    travel_radius_km: 15,
    latitude: 40.7308,
    longitude: -73.9975,
    bio: null,
    address: null,
    is_available: true,
    services: ['cleaning', 'laundry'],
    cancellation_policy: 'moderate',
    response_time_minutes: 20,
    has_insurance: true,
    created_at: '',
    profile: {
      id: 'sample-1',
      full_name: 'Maria S.',
      role: 'cleaner',
      email: null,
      phone: null,
      avatar_url: null,
      stripe_account_id: null,
      stripe_customer_id: null,
      is_verified: true,
      verification_code: null,
      verification_code_sent_at: null,
      airbnb_listing_url: null,
      created_at: '',
    },
  },
  {
    id: 'sample-2',
    average_rating: 4.7,
    total_jobs: 64,
    hourly_rate: 42,
    travel_radius_km: 25,
    latitude: 40.7128,
    longitude: -74.006,
    bio: null,
    address: null,
    is_available: true,
    services: ['cleaning', 'restocking', 'handyman'],
    cancellation_policy: 'flexible',
    response_time_minutes: 35,
    has_insurance: false,
    created_at: '',
    profile: {
      id: 'sample-2',
      full_name: 'James T.',
      role: 'cleaner',
      email: null,
      phone: null,
      avatar_url: null,
      stripe_account_id: null,
      stripe_customer_id: null,
      is_verified: true,
      verification_code: null,
      verification_code_sent_at: null,
      airbnb_listing_url: null,
      created_at: '',
    },
  },
];

export function LandingMap() {
  return (
    <div className="h-[360px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <SearchMap cleaners={SAMPLE} center={[40.7218, -74.0]} activeId="sample-1" />
    </div>
  );
}
