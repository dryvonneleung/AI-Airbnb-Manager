import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

/**
 * Returns the authenticated user's id + profile, or null if not signed in.
 * For use inside Route Handlers and Server Components.
 */
export async function getSessionProfile(): Promise<{
  userId: string;
  profile: Profile;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return { userId: user.id, profile: profile as Profile };
}
