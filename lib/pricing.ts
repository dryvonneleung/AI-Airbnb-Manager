/**
 * Central pricing logic for Cleanrus bookings.
 *
 * The spec has two fee figures that we reconcile here:
 *   - The PLATFORM takes an 18% transaction fee on every booking. This is the
 *     Stripe `application_fee_amount` and is deducted from the cleaner's side,
 *     so the cleaner nets 82% of the charged amount.
 *   - The HOST sees a transparent breakdown in the booking flow that surfaces a
 *     small "convenience fee" (displayed as 2% of the job) on top of the
 *     cleaner's rate × hours.
 *
 * To keep every downstream number consistent we treat the amount actually
 * charged to the host (subtotal + convenience fee) as the booking `amount`.
 * The 18% platform fee and 82% payout are always computed from that charged
 * amount, so `platform_fee + cleaner_payout === amount` exactly (to the cent).
 */

export const PLATFORM_FEE_RATE = 0.18; // 18% – taken from the charged amount
export const CONVENIENCE_FEE_RATE = 0.02; // 2% – host-facing line item

export interface PriceBreakdown {
  /** cleaner hourly rate × estimated hours */
  subtotal: number;
  /** host-facing convenience fee (2% of subtotal) */
  convenienceFee: number;
  /** total charged to the host = subtotal + convenience fee */
  total: number;
  /** platform's 18% cut of the total */
  platformFee: number;
  /** cleaner's 82% payout */
  cleanerPayout: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computePrice(hourlyRate: number, hours: number): PriceBreakdown {
  const subtotal = round2(hourlyRate * hours);
  const convenienceFee = round2(subtotal * CONVENIENCE_FEE_RATE);
  const total = round2(subtotal + convenienceFee);
  const platformFee = round2(total * PLATFORM_FEE_RATE);
  const cleanerPayout = round2(total - platformFee);
  return { subtotal, convenienceFee, total, platformFee, cleanerPayout };
}

/** Convert a dollar amount to integer cents for Stripe. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
