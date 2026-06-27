import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  verifyCredentials,
  createContextClient,
  createAdminClient,
} from '@supabase/server/core';
import type {
  AuthModeWithKey,
  SupabaseContext,
  SupabaseEnv,
} from '@supabase/server';

/**
 * `@supabase/server` for Next.js App Router.
 *
 * The high-level `withSupabase` / `createSupabaseContext(request)` helpers are
 * header-based (they read the JWT from the `Authorization` header), which suits
 * Edge Functions and Workers. In Next.js the user's JWT lives in `@supabase/ssr`
 * session cookies, so — per the package's own `docs/ssr-frameworks.md` — we
 * compose the `@supabase/server/core` primitives with `@supabase/ssr`:
 *
 *   1. middleware.ts (already present) refreshes the access-token cookie.
 *   2. `@supabase/ssr` reads the fresh cookie and yields the access token.
 *   3. `verifyCredentials` cryptographically verifies it against the JWKS.
 *   4. `createContextClient` builds an RLS-scoped client bound to that token.
 *   5. `createAdminClient` builds a service-role client (bypasses RLS).
 *
 * The returned bundle matches the high-level `SupabaseContext`, so route
 * handlers get the familiar `{ supabase, supabaseAdmin, userClaims, ... }`.
 */

/**
 * Bridge this project's env var names into the `SupabaseEnv` shape the core
 * primitives expect. Supports both the new publishable/secret key names and the
 * legacy anon/service-role names this repo originally used.
 */
function resolveNextEnv(): Partial<SupabaseEnv> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    url: url ?? undefined,
    publishableKeys: publishableKey ? { default: publishableKey } : {},
    secretKeys: secretKey ? { default: secretKey } : {},
  };
}

// Module-scoped JWKS cache. On serverless (Vercel) this is per-invocation, so
// prefer setting SUPABASE_JWKS in production to avoid the fetch each cold start.
let cachedJwks: SupabaseEnv['jwks'] = null;

async function getJwks(supabaseUrl: string): Promise<SupabaseEnv['jwks']> {
  if (cachedJwks) return cachedJwks;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) return null;
    cachedJwks = await res.json();
    return cachedJwks;
  } catch {
    return null;
  }
}

export async function createSupabaseContext(
  options: { auth?: AuthModeWithKey | AuthModeWithKey[] } = { auth: 'user' }
): Promise<
  { data: SupabaseContext; error: null } | { data: null; error: Error }
> {
  const nextEnv = resolveNextEnv();

  if (!nextEnv.url || !nextEnv.publishableKeys?.default) {
    return {
      data: null,
      error: new Error('Missing SUPABASE_URL or a publishable/anon key'),
    };
  }

  // Read the @supabase/ssr session cookie. The middleware has already refreshed
  // the access token, so getSession() returns a fresh JWT.
  const cookieStore = cookies();
  const ssrClient = createServerClient(
    nextEnv.url,
    nextEnv.publishableKeys.default,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can't write cookies — middleware handles refresh.
          }
        },
      },
    }
  );

  const {
    data: { session },
  } = await ssrClient.auth.getSession();
  const token = session?.access_token ?? null;

  const jwks = await getJwks(nextEnv.url);
  const env: Partial<SupabaseEnv> = { ...nextEnv, jwks };

  const { data: auth, error } = await verifyCredentials(
    { token, apikey: null },
    { auth: options.auth ?? 'user', env }
  );
  if (error) {
    return { data: null, error };
  }

  const supabase = createContextClient({ auth: { token: auth!.token }, env });
  const supabaseAdmin = createAdminClient({ env });

  return {
    data: {
      supabase,
      supabaseAdmin,
      userClaims: auth!.userClaims,
      jwtClaims: auth!.jwtClaims,
      authMode: auth!.authMode,
    },
    error: null,
  };
}
