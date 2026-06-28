import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 *
 * All CivicPulse data access happens server-side (API routes + server
 * components), so we use the service-role key. It bypasses RLS and must NEVER
 * be exposed to the browser — keep it in SUPABASE_SERVICE_ROLE_KEY (no
 * NEXT_PUBLIC_ prefix), so Next never bundles it client-side.
 */

/** Accept either the new secret key (sb_secret_…) or the legacy service-role JWT. */
function secretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && secretKey());
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, secretKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
