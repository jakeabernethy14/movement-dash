"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkedSettings, setCheckedSettings] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("allow_registration")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        setRegistrationOpen(data ? data.allow_registration : true);
        setCheckedSettings(true);
      });
  }, []); // eslint-disable-line

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1. Create the auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Could not create account.");
      setLoading(false);
      return;
    }

    // 2. Redeem the register token -> creates profile + account_type + (optional) pt_client link
    const { error: redeemError } = await supabase.rpc("redeem_register_token", {
      p_token: token.trim(),
      p_profile_id: data.user.id,
      p_full_name: fullName,
      p_email: email,
    });

    if (redeemError) {
      setError(
        redeemError.message.includes("INVALID_OR_EXPIRED_TOKEN")
          ? "That registration token is invalid, expired, or already used up."
          : redeemError.message
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // If email confirmation is off, session exists immediately -> go straight to dashboard.
    if (data.session) {
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    }
  }

  if (checkedSettings && !registrationOpen) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 max-w-sm text-center">
          <h1 className="text-lg font-semibold mb-2">Registration closed</h1>
          <p className="text-neutral-400 text-sm mb-4">
            New sign-ups are currently disabled. Ask your trainer for access.
          </p>
          <Link href="/" className="text-gold-400 hover:underline text-sm">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Join <span className="text-gold-400">The Movement Coaching</span>
          </h1>
          <p className="text-neutral-400 text-sm mt-1">You'll need an invite token from your trainer</p>
        </div>

        {success ? (
          <div className="card p-6 text-center space-y-2">
            <p className="text-gold-400 font-medium">Account created 🎉</p>
            <p className="text-neutral-400 text-sm">
              Check your email to confirm your account, then sign in.
            </p>
            <Link href="/" className="btn-primary inline-block mt-2">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="card p-6 space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-900 text-red-300 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <label className="label-text">Registration token</label>
              <input
                required
                className="input-field font-mono"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. TMC-8X3K-QP1Z"
              />
            </div>
            <div>
              <label className="label-text">Full name</label>
              <input
                required
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text">Email</label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text">Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating account…" : "Create account"}
            </button>
            <p className="text-center text-sm text-neutral-400">
              Already have an account?{" "}
              <Link href="/" className="text-gold-400 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
