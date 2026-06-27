import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. BYPASSES Row Level Security — only ever import
 * this from server-side code (Route Handlers, Edge Functions, webhooks). Never
 * expose the service role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
