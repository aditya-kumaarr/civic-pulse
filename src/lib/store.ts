import { localStore } from "./store.local";
import { supabaseStore } from "./store.supabase";
import { isSupabaseConfigured } from "./supabase";

/**
 * Single data-access entry point for the whole app.
 *
 * - Supabase env vars present  → real, shared Postgres backend.
 * - Otherwise                  → local file store (zero-config demo).
 *
 * Both satisfy the same interface, so nothing else in the app changes when you
 * flip between them. The choice is made once, at module load.
 */
export const store = isSupabaseConfigured() ? supabaseStore : localStore;

if (isSupabaseConfigured()) {
  console.log("[store] using Supabase backend");
}

export type { Store } from "./store.local";
