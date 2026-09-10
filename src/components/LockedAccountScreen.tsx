"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function LockedAccountScreen({
  userId,
  fullName,
  email,
}: {
  userId: string;
  fullName: string;
  email: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: valid } = await supabase.rpc("validate_register_token", { p_token: token.trim() });
    if (!valid) {
      setError("That token is invalid, expired, or already used up.");
      setLoading(false);
      return;
    }

    const { error: redeemError } = await supabase.rpc("redeem_register_token", {
      p_token: token.trim(),
      p_profile_id: userId,
      p_full_name: fullName,
      p_email: email,
    });

    if (redeemError) {
      setError("That token couldn't be redeemed — it may have just been used by someone else.");
      setLoading(false);
      return;
    }

    // Reload so the freshly-extended access_expires_at is picked up everywhere.
    window.location.reload();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{
            background: "rgba(212,175,55,0.08)",
            border: "1px solid rgba(212,175,55,0.3)",
          }}
        >
          <LockKeyhole className="text-gold-300" size={22} />
        </div>
        <h1 className="text-xl font-bold mb-1">Your access has expired</h1>
        <p className="text-neutral-400 text-sm mb-6">
          Enter a new token from your trainer to renew your account.
        </p>

        <form onSubmit={redeem} className="card p-6 space-y-3 text-left">
          {error && (
            <div className="bg-red-900/30 border border-red-900 text-red-300 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="label-text">Renewal token</label>
            <input
              required
              className="input-field font-mono"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. TMC-8X3K-QP1Z"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Renewing…" : "Renew access"}
          </button>
        </form>

        <button onClick={logout} className="text-sm text-neutral-500 hover:text-neutral-300 mt-6">
          Log out
        </button>
      </div>
    </div>
  );
}
