import { NextResponse } from 'next/server';
import { createSupabaseContext } from '@/lib/supabase/context';

/**
 * GET /api/me — reference handler built on `@supabase/server`.
 *
 * Demonstrates the package's Next.js composition pattern: `createSupabaseContext`
 * verifies the cookie-borne JWT against the JWKS and hands back the same
 * `ctx.supabase` (RLS-scoped) and `ctx.supabaseAdmin` (bypasses RLS) bundle the
 * high-level `withSupabase` wrapper provides on Edge Functions.
 *
 * NOTE: JWT verification requires asymmetric JWT signing keys to be enabled on
 * the Supabase project (so `/auth/v1/.well-known/jwks.json` is published).
 */
export async function GET() {
  const { data: ctx, error } = await createSupabaseContext({ auth: 'user' });
  if (error || !ctx) {
    return NextResponse.json(
      { error: error?.message ?? 'Unauthorized' },
      { status: 401 }
    );
  }

  // ctx.supabase is RLS-scoped to the authenticated user.
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('id, role, full_name, email, is_verified')
    .eq('id', ctx.userClaims!.id)
    .single();

  return NextResponse.json({
    userClaims: ctx.userClaims,
    authMode: ctx.authMode,
    profile,
  });
}
