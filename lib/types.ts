// Shared application types mirroring the Supabase schema.

export type Role = 'host' | 'cleaner';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'photo_submitted'
  | 'disputed'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export type ServiceType = 'cleaning' | 'handyman' | 'laundry' | 'restocking';

export const SERVICE_TYPES: ServiceType[] = [
  'cleaning',
  'handyman',
  'laundry',
  'restocking',
];

export interface Profile {
  id: string;
  role: Role | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  stripe_account_id: string | null;
  stripe_customer_id: string | null;
  is_verified: boolean;
  verification_code: string | null;
  verification_code_sent_at: string | null;
  airbnb_listing_url: string | null;
  created_at: string;
}

export interface CleanerProfile {
  id: string;
  bio: string | null;
  hourly_rate: number | null;
  travel_radius_km: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  is_available: boolean;
  services: string[] | null;
  cancellation_policy: CancellationPolicy | null;
  average_rating: number;
  total_jobs: number;
  response_time_minutes: number | null;
  has_insurance: boolean;
  created_at: string;
}

export interface CleanerWithProfile extends CleanerProfile {
  profile: Profile;
}

export interface Property {
  id: string;
  host_id: string;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  airbnb_url: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  notes: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  host_id: string;
  cleaner_id: string;
  property_id: string;
  stripe_payment_intent_id: string | null;
  amount: number | null;
  platform_fee: number | null;
  cleaner_payout: number | null;
  status: BookingStatus;
  scheduled_at: string | null;
  duration_hours: number | null;
  services_requested: string[] | null;
  special_instructions: string | null;
  dispute_reason: string | null;
  funds_released_at: string | null;
  created_at: string;
}

export interface CleaningProof {
  id: string;
  booking_id: string;
  before_photos: string[];
  after_photos: string[];
  submitted_at: string;
  approved_at: string | null;
  dispute_window_ends_at: string | null;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  booking_id: string | null;
  created_at: string;
}
