import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient stores the session in cookies (not localStorage).
// This allows Next.js server components and middleware to read the session,
// eliminating hydration mismatches and production loading issues.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);