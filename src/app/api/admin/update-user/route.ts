import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";

// This route is the ONLY place in the app that touches the Supabase service-role key.
// It never runs in the browser. It:
//   1. Reads the caller's session from cookies using the normal (anon-key) server client.
//   2. Confirms the caller is an owner, or a trainer editing one of THEIR OWN clients.
//   3. Uses the service-role admin client to perform privileged actions (password reset,
//      changing another user's profile fields) that RLS + the anon key can never allow.
//
// Requires SUPABASE_SERVICE_ROLE_KEY to be set as a server-only env var (NOT NEXT_PUBLIC_).

export async function POST(req: Request) {
  const body = await req.json();
  const { targetUserId, newPassword, fullName, username, accessExpiresAt, disabled } = body as {
    targetUserId: string;
    newPassword?: string;
    fullName?: string;
    username?: string;
    accessExpiresAt?: string | null;
    disabled?: boolean;
  };

  if (!targetUserId) {
    return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL." },
      { status: 500 }
    );
  }

  // 1. Identify the caller from their session cookie.
  const supabase = createServerSupabase();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: callerTypes } = await supabase
    .from("account_types")
    .select("type")
    .eq("profile_id", caller.id);
  const callerRoles = (callerTypes ?? []).map((t) => t.type);
  const callerIsOwner = callerRoles.includes("owner");
  const callerIsTrainer = callerRoles.includes("trainer");

  // 2. Authorization: owner can edit anyone; a trainer can only edit their own clients.
  if (!callerIsOwner) {
    if (!callerIsTrainer) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const { data: relation } = await supabase
      .from("pt_clients")
      .select("id")
      .eq("pt_id", caller.id)
      .eq("client_id", targetUserId)
      .maybeSingle();
    if (!relation) {
      return NextResponse.json(
        { error: "You can only edit your own clients." },
        { status: 403 }
      );
    }
  }

  const admin = createRawClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Password reset (auth-level change, requires service role).
  if (newPassword) {
    const { error } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 4. Profile field updates.
  const profileUpdate: Record<string, any> = {};
  if (fullName !== undefined) profileUpdate.full_name = fullName;
  if (username !== undefined) profileUpdate.username = username || null;
  if (accessExpiresAt !== undefined) profileUpdate.access_expires_at = accessExpiresAt;
  if (disabled !== undefined) profileUpdate.disabled = disabled;

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin.from("profiles").update(profileUpdate).eq("id", targetUserId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
