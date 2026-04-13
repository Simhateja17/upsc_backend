import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
}

function supabaseAnon() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export async function getBearerUser(accessToken: string | null): Promise<User | null> {
  if (!accessToken || !supabaseUrl() || !supabaseAnon()) return null;
  const supabase = createClient(supabaseUrl(), supabaseAnon(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export function getBearerFromRequest(req: Request): string | null {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

const ADMIN_EMAILS: string[] = [
  'couture.founders@gmail.com',
  'manasareddycherukupalli@gmail.com',
];

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  // Check role from metadata
  const r =
    (user.app_metadata as { role?: string } | undefined)?.role ??
    (user.user_metadata as { role?: string } | undefined)?.role;
  if (r === 'admin') return true;
  // Fallback: check against admin email allowlist
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}
