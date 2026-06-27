import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Insert a notification row. Pass a service-role or RLS-scoped client capable
 * of writing to the `notifications` table for `userId`.
 */
export async function notify(
  supabase: SupabaseClient,
  params: {
    userId: string;
    type: string;
    message: string;
    bookingId?: string | null;
  }
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    message: params.message,
    booking_id: params.bookingId ?? null,
  });
}
