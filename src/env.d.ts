/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  /**
   * Optional: Development-only user ID for bypassing authentication
   * WARNING: Only use in local development, never in production!
   */
  readonly DEV_USER_ID?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
