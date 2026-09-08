"use client";
import { createBrowserClient } from "@supabase/ssr";

// During `next build`, Next.js renders every page once to produce its initial
// HTML/RSC payload -- including pages that only ever run client-side logic in
// useEffect. If the URL/key aren't defined at build time (e.g. not yet added
// in Vercel), createBrowserClient throws and takes the whole build down. We
// fall back to harmless placeholders so the build always succeeds; in the
// actual browser, as long as the real env vars were present when Vercel
// built the app, the real values are used instead.
//
// Supabase now issues a "publishable" key (sb_publishable_...) that replaces
// the older "anon" key -- both work identically with createBrowserClient, so
// we accept whichever one is set.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-anon-key";

if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. " +
      "Add them in your Vercel project's Environment Variables and redeploy."
  );
}

export function createClient() {
  return createBrowserClient(url, anonKey);
}
