import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';

/**
 * POST /api/stripe/connect
 * Creates (or reuses) a Stripe Connect Express account for the cleaner and
 * returns a hosted onboarding URL. The account id is stored on the profile;
 * the account becomes payout-ready after onboarding completes.
 */
export async function POST() {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== 'cleaner') {
    return NextResponse.json({ error: 'Cleaners only' }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  let accountId = session.profile.stripe_account_id;

  // Create the Express account on first connect.
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: session.profile.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: { profileId: session.userId },
    });
    accountId = account.id;

    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', session.userId);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/dashboard/cleaner?stripe=refresh`,
    return_url: `${appUrl}/dashboard/cleaner?stripe=return`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}
