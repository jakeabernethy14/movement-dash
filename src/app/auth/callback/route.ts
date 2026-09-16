import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
/** Password recovery only. A fixed same-origin destination avoids open redirects. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  try {
    if (code) {
      const { error } = await createClient().auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/reset-password", request.url));
    }
  } catch {
    // Show a recoverable error rather than leaking provider/network details.
  }
  return NextResponse.redirect(new URL("/reset-password?error=invalid_link", request.url));
}
