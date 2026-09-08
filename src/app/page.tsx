"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);

  useEffect(() => {
    // remembered email
    const saved = localStorage.getItem("tmc_remember_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
    supabase
      .from("app_settings")
      .select("allow_registration")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setRegistrationOpen(data.allow_registration);
      });
  }, []); // eslint-disable-line

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Check disabled flag
    const { data: profile } = await supabase
      .from("profiles")
      .select("disabled")
      .eq("id", data.user?.id)
      .single();

    if (profile?.disabled) {
      await supabase.auth.signOut();
      setError("This account has been disabled. Contact the studio owner.");
      setLoading(false);
      return;
    }

    if (remember) {
      localStorage.setItem("tmc_remember_email", email);
    } else {
      localStorage.removeItem("tmc_remember_email");
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* subtle background glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/30 mb-4">
            <span className="text-gold-400 text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            The <span className="text-gold-400">Movement</span> Coaching
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="card p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-900 text-red-300 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="label-text">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-gold-500 w-4 h-4"
              />
              Remember me
            </label>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {registrationOpen && (
            <p className="text-center text-sm text-neutral-400 pt-2">
              Have an invite token?{" "}
              <Link href="/register" className="text-gold-400 hover:underline">
                Register here
              </Link>
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
