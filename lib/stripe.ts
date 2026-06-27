import Stripe from 'stripe';

/**
 * Server-side Stripe client. The secret key must never reach the browser.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-04-10',
  typescript: true,
});
