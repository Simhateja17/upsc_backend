import { createClient } from "@supabase/supabase-js";
import { Agent, fetch as undiciFetch } from "undici";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

if (!supabaseServiceKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY — required for database operations");
}

// Force IPv4 for all Supabase REST API calls.
// Node.js v22+ built-in fetch uses an internal undici that ignores
// setGlobalDispatcher from the npm undici package. Passing the dispatcher
// directly to the fetch call is the only reliable solution.
const ipv4Agent = new Agent({ connect: { family: 4 } });

const ipv4Fetch: typeof globalThis.fetch = (input, init?) => {
  return undiciFetch(input as string, {
    ...(init as any),
    dispatcher: ipv4Agent,
  }) as unknown as ReturnType<typeof globalThis.fetch>;
};

// Client for public operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: ipv4Fetch },
});

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  global: { fetch: ipv4Fetch },
});

export default supabase;
