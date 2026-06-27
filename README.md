# Cleanrus 🧽

A full-stack marketplace connecting short-term rental hosts with professional
cleaners. Funds are held in escrow until the cleaner submits photo proof of a
completed clean; the host then has a **24-hour dispute window** before funds
auto-release. The platform charges an **18% transaction fee** on every booking.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Database / Auth / Storage | Supabase (Postgres + RLS + Storage) |
| Payments | Stripe Connect (Express accounts, manual-capture escrow) |
| Maps | Leaflet.js + OpenStreetMap tiles |
| Geocoding | Nominatim (free, OSM) |
| Styling | Tailwind CSS |
| Hosting | Vercel |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@cleanrus.com
```

### Database setup

1. Create a Supabase project.
2. Open the SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql).
   This creates all tables, Row Level Security policies, the `cleaning-proofs`
   and `avatars` storage buckets, and a trigger that creates a profile row on
   signup.
3. Enable the `pg_cron` and `pg_net` extensions, then uncomment and configure
   the `cron.schedule(...)` block at the bottom of the schema to call the
   auto-release Edge Function hourly.

### Stripe setup

1. Enable **Connect** in your Stripe dashboard (Express accounts).
2. Add a webhook endpoint pointing at `/api/stripe/webhook` and subscribe to
   `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`,
   `payment_intent.canceled`, and `account.updated`. Put the signing secret in
   `STRIPE_WEBHOOK_SECRET`.

### Edge Function

```bash
supabase functions deploy auto-release --no-verify-jwt
```

The function (in `supabase/functions/auto-release`) captures any held
PaymentIntent whose 24-hour dispute window has elapsed and marks the booking
`completed`.

## Payment flow (escrow)

1. **Host books** → a PaymentIntent is created with `capture_method: 'manual'`,
   `application_fee_amount` = 18%, and `transfer_data.destination` = the
   cleaner's connected account. Booking status `pending`.
2. **Host pays** → card is authorized (funds *held*, not captured). Status
   `confirmed`.
3. **Cleaner submits photo proof** (≥2 before, ≥2 after) → status
   `photo_submitted`; a 24-hour dispute window starts; host is notified.
4. **Host approves** → PaymentIntent is captured (Stripe splits 82% to the
   cleaner / 18% to the platform). Status `completed`.
   - **No action in 24h** → the cron-driven Edge Function captures
     automatically.
   - **Host disputes** → status `disputed`, funds stay held for manual review.

## Project structure

```
app/
  api/                 Route handlers (bookings, stripe, cleaners, reviews, …)
  book/[cleanerId]/    Multi-step booking + Stripe payment flow
  cleaners/[id]/       Public cleaner profile
  dashboard/host/      Host dashboard, properties, booking detail
  dashboard/cleaner/   Cleaner dashboard, profile editor, jobs, earnings
  login, signup        Auth pages
  search/              Full-screen Leaflet directory map
components/             Shared + role-specific UI (maps, timeline, forms)
lib/                    Supabase clients, Stripe, pricing, geo, types
supabase/               schema.sql + auto-release Edge Function
```

## Key business rules

- Cleaners can't receive bookings until a Stripe payout account is connected.
- Hosts must have submitted an Airbnb listing URL before booking (MVP gate).
- Photo proof requires ≥2 before **and** ≥2 after photos.
- Reviews are only allowed once a booking is `completed`.
- Platform fee is always 18% of the charged booking amount.
- The dispute window is always exactly 24 hours from photo submission.
