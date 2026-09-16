"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthFrame from "@/components/AuthFrame";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    // Validate the token BEFORE creating an auth account, so a bad/used token
    // never leaves an orphaned account behind.
    const { data: tokenValid, error: validateError } = await supabase.rpc("validate_register_token", {
      p_token: token.trim(),
    });

    if (validateError || !tokenValid) {
      setError("That registration token is invalid, expired, or already used up.");
      setLoading(false);
      return;
    }

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
          ? "That token was just used by someone else. Ask your trainer for a new one."
          : redeemError.message
      );
      setLoading(false);
      return;
    }

    // 3. Set the username, if provided (best-effort; ignore uniqueness conflicts silently
    // other than surfacing them, since the account itself is already created successfully).
    if (username.trim()) {
      const { error: usernameError } = await supabase
        .from("profiles")
        .update({ username: username.trim() })
        .eq("id", data.user.id);
      if (usernameError) {
        setError(
          "Account created, but that username was already taken -- you can set one later from Account settings."
        );
      }
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
    return <AuthFrame title="We'll be back soon." description="New sign-ups are currently disabled. Ask your trainer for access."><Link href="/" className="btn-secondary">Back to sign in</Link></AuthFrame>;
  }
  return <AuthFrame title={success ? "You're part of the movement." : "Your next chapter."} description={success ? "Your account has been created. Check your email if confirmation is required." : "Bring your invitation. We'll take care of the rest."} label="JOIN THE MOVEMENT">
    {success ? <div className="auth-success"><p>You're ready to get started. Once your email is confirmed, sign in to see your coaching workspace.</p><Link href="/" className="btn-primary auth-submit mt-4">Continue to sign in<ArrowRight size={15}/></Link></div> : <form onSubmit={handleRegister} className="auth-form" style={{ gap: 14 }}>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div><label htmlFor="reg-token" className="label-text">Invitation token</label><input id="reg-token" required className="input-field font-mono" value={token} onChange={e => setToken(e.target.value)} placeholder="Your token from your coach"/></div>
      <div><label htmlFor="reg-name" className="label-text">Full name</label><input id="reg-name" required autoComplete="name" className="input-field" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"/></div>
      <div><label htmlFor="reg-username" className="label-text">Username (optional)</label><input id="reg-username" autoComplete="username" autoCapitalize="none" className="input-field" value={username} onChange={e => setUsername(e.target.value)} placeholder="An alternative to your email at sign-in"/></div>
      <div><label htmlFor="reg-email" className="label-text">Email address</label><input id="reg-email" type="email" required autoComplete="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></div>
      <div><label htmlFor="reg-password" className="label-text">Create a password</label><div className="relative"><input id="reg-password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" className="input-field pr-12" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div>
      <button type="submit" disabled={loading || !checkedSettings} className="btn-primary auth-submit">{loading ? "Creating your account..." : "Let's get started"}<ArrowRight size={15}/></button>
      <p className="auth-invite">Already part of the movement? <Link href="/">Sign in</Link></p>
    </form>}
  </AuthFrame>;
}
