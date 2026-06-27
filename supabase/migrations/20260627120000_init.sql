-- ============================================================================
-- Cleanrus initial schema migration.
--
-- This is the canonical schema applied by the Supabase GitHub integration
-- (and `supabase db push`). It mirrors supabase/schema.sql, which is kept for
-- the manual "paste into the SQL editor" path. Keep the two in sync.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT CHECK (role IN ('host', 'cleaner')),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  stripe_account_id TEXT,
  stripe_customer_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verification_code_sent_at TIMESTAMPTZ,
  airbnb_listing_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleaner_profiles (
  id UUID REFERENCES profiles PRIMARY KEY,
  bio TEXT,
  hourly_rate DECIMAL(10,2),
  travel_radius_km INTEGER DEFAULT 20,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  address TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  services TEXT[],
  cancellation_policy TEXT CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict')),
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  response_time_minutes INTEGER,
  has_insurance BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES profiles,
  name TEXT,
  address TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  airbnb_url TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES profiles,
  cleaner_id UUID REFERENCES profiles,
  property_id UUID REFERENCES properties,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  cleaner_payout DECIMAL(10,2),
  status TEXT CHECK (status IN (
    'pending','confirmed','in_progress','photo_submitted',
    'disputed','completed','cancelled','refunded'
  )) DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  duration_hours DECIMAL(4,2),
  services_requested TEXT[],
  special_instructions TEXT,
  dispute_reason TEXT,
  funds_released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleaning_proofs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings,
  before_photos TEXT[],
  after_photos TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  dispute_window_ends_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings UNIQUE,
  reviewer_id UUID REFERENCES profiles,
  reviewee_id UUID REFERENCES profiles,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  type TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  booking_id UUID REFERENCES bookings,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bookings_host ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cleaner ON bookings(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_proofs_window ON cleaning_proofs(dispute_window_ends_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomically bump a cleaner's completed-job count (used by the auto-release fn).
CREATE OR REPLACE FUNCTION public.increment_total_jobs(cleaner UUID)
RETURNS VOID AS $$
  UPDATE public.cleaner_profiles
  SET total_jobs = COALESCE(total_jobs, 0) + 1
  WHERE id = cleaner;
$$ LANGUAGE sql;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can read (public directory); users edit only their own.
DROP POLICY IF EXISTS "profiles_read" ON profiles;
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- cleaner_profiles: public read (directory/search); cleaner edits own.
DROP POLICY IF EXISTS "cleaner_read" ON cleaner_profiles;
CREATE POLICY "cleaner_read" ON cleaner_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "cleaner_upsert_own" ON cleaner_profiles;
CREATE POLICY "cleaner_upsert_own" ON cleaner_profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "cleaner_update_own" ON cleaner_profiles;
CREATE POLICY "cleaner_update_own" ON cleaner_profiles FOR UPDATE USING (auth.uid() = id);

-- properties: only the owning host.
DROP POLICY IF EXISTS "properties_owner" ON properties;
CREATE POLICY "properties_owner" ON properties
  FOR ALL USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

-- bookings: visible to the host or the cleaner on the booking.
DROP POLICY IF EXISTS "bookings_party_read" ON bookings;
CREATE POLICY "bookings_party_read" ON bookings
  FOR SELECT USING (auth.uid() = host_id OR auth.uid() = cleaner_id);
DROP POLICY IF EXISTS "bookings_host_insert" ON bookings;
CREATE POLICY "bookings_host_insert" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "bookings_party_update" ON bookings;
CREATE POLICY "bookings_party_update" ON bookings
  FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = cleaner_id);

-- cleaning_proofs: readable/writable by either party of the parent booking.
DROP POLICY IF EXISTS "proofs_party_read" ON cleaning_proofs;
CREATE POLICY "proofs_party_read" ON cleaning_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = cleaning_proofs.booking_id
        AND (b.host_id = auth.uid() OR b.cleaner_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "proofs_cleaner_insert" ON cleaning_proofs;
CREATE POLICY "proofs_cleaner_insert" ON cleaning_proofs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = cleaning_proofs.booking_id AND b.cleaner_id = auth.uid()
    )
  );

-- reviews: public read; reviewer can create their own.
DROP POLICY IF EXISTS "reviews_read" ON reviews;
CREATE POLICY "reviews_read" ON reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- notifications: only the owner.
DROP POLICY IF EXISTS "notifications_owner_read" ON notifications;
CREATE POLICY "notifications_owner_read" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_owner_update" ON notifications;
CREATE POLICY "notifications_owner_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage buckets (public read) + policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaning-proofs', 'cleaning-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "proofs_public_read" ON storage.objects;
CREATE POLICY "proofs_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'cleaning-proofs');

DROP POLICY IF EXISTS "proofs_auth_upload" ON storage.objects;
CREATE POLICY "proofs_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cleaning-proofs');

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_upload" ON storage.objects;
CREATE POLICY "avatars_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- ---------------------------------------------------------------------------
-- pg_cron auto-release (configure in the dashboard; needs project ref + key).
-- Left commented so the migration applies cleanly without secrets in git.
-- See supabase/schema.sql for the cron.schedule(...) snippet.
-- ---------------------------------------------------------------------------
