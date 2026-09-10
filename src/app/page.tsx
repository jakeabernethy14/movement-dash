"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);

  useEffect(() => {
    // remembered email
    const saved = localStorage.getItem("tmc_remember_email");
    if (saved) {
      setIdentifier(saved);
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

    // Resolve "email or username" to an actual email via a small RPC
    // (profiles aren't readable pre-auth, so this uses a security-definer function).
    const { data: resolvedEmail, error: resolveError } = await supabase.rpc("email_for_login", {
      p_identifier: identifier.trim(),
    });

    if (resolveError || !resolvedEmail) {
      setError("We couldn't find an account with that email or username.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Check disabled flag (access-expired accounts are allowed to sign in --
    // the dashboard itself shows a locked screen prompting for a renewal token).
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
      localStorage.setItem("tmc_remember_email", identifier);
    } else {
      localStorage.removeItem("tmc_remember_email");
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* ambient gold glow */}
      <div
        className="pointer-events-none absolute -top-1/3 left-1/2 w-[36rem] h-[36rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0) 70%)",
          animation: "drift-a 16s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0) 70%)",
          animation: "drift-b 20s ease-in-out infinite",
        }}
      />
      {/* slow rising gold specks -- subtle, not distracting */}
      {[...Array(10)].map((_, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${(i * 37) % 100}%`,
            bottom: "-10px",
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            background: "rgba(242,201,76,0.7)",
            boxShadow: "0 0 6px 1px rgba(242,201,76,0.5)",
            animation: `float-particle ${14 + (i % 5) * 3}s linear infinite`,
            animationDelay: `${i * 1.7}s`,
          }}
        />
      ))}

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(150deg, rgba(242,201,76,0.16), rgba(212,175,55,0.04))",
              border: "1px solid rgba(212,175,55,0.35)",
              boxShadow: "0 0 24px -8px rgba(212,175,55,0.5)",
            }}
          >
            <span className="text-gold-300 text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-50">
            The <span className="text-gold-300">Movement</span> Coaching
          </h1>
          <p className="text-neutral-500 text-sm mt-1.5 tracking-wide">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="card p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-900 text-red-300 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="label-text">Email or username</label>
            <input
              type="text"
              required
              className="input-field"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or username"
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
      <div className="absolute bottom-4 inset-x-0 text-center text-xs text-neutral-600">
        © {new Date().getFullYear()} The Movement Coaching
      </div>
    </main>
  );
}
