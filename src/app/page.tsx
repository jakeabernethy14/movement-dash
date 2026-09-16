"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Loader2, Mail, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthFrame from "@/components/AuthFrame";
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  useEffect(() => {
    try { const saved = localStorage.getItem("tmc_remember_email"); if (saved) setIdentifier(saved); } catch { /* Storage may be restricted in private mode. */ }
    supabase.from("app_settings").select("allow_registration").eq("id", 1).single().then(({ data }) => { if (data) setRegistrationOpen(data.allow_registration); });
  }, [supabase]);
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); if (loading) return; setError(null); setLoading(true);
    try {
      const { data: resolvedEmail, error: resolveError } = await supabase.rpc("email_for_login", { p_identifier: identifier.trim() });
      if (resolveError) throw new Error("Unable to connect. Please try again in a moment.");
      if (!resolvedEmail) throw new Error("Those login details don't match. Please check them and try again.");
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error("We couldn't sign you in. Please try again.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("disabled").eq("id", data.user.id).single();
      if (profileError) { await supabase.auth.signOut(); throw new Error("Your account profile couldn't be loaded. Please contact your coach."); }
      if (profile?.disabled) { await supabase.auth.signOut(); throw new Error("This account is disabled. Please contact the studio owner."); }
      try { if (remember) localStorage.setItem("tmc_remember_email", identifier.trim()); else localStorage.removeItem("tmc_remember_email"); } catch { /* Sign-in does not depend on browser storage. */ }
      router.push("/dashboard"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "We couldn't sign you in. Please check your connection."); }
    finally { setLoading(false); }
  }
  return <AuthFrame title="Welcome back." description="Your next step starts here. Sign in to your account."><form onSubmit={handleLogin} className="auth-form">{error && <div className="error-banner" role="alert">{error}</div>}<div><label htmlFor="login-identifier" className="label-text">Email or username</label><div className="auth-input"><Mail size={16}/><input id="login-identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} required className="input-field" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Enter your email or username"/></div></div><div><label htmlFor="login-password" className="label-text">Password</label><div className="auth-input"><LockKeyhole size={16}/><input id="login-password" autoComplete="current-password" required type={visible ? "text" : "password"} className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/><button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="password-toggle" onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div><div className="auth-options"><label><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/>Remember my login</label><Link href="/forgot-password">Forgot password?</Link></div><button className="btn-primary auth-submit" type="submit" disabled={loading}>{loading ? <><Loader2 className="animate-spin" size={16}/>Signing you in...</> : <>Let's get moving<ArrowRight size={16}/></>}</button></form><div className="auth-divider"><span/>YOUR COACHING JOURNEY<span/></div>{registrationOpen ? <div className="auth-invite"><p>New to The Movement?</p><Link href="/register">Join with your invite token<ArrowUpRight size={13}/></Link></div> : <p className="auth-invite muted">Contact your trainer to join The Movement.</p>}<Link href="/preview" className="auth-preview-link">Take a look around the preview<ArrowRight size={12}/></Link><p className="auth-security"><LockKeyhole size={12}/>Your account. Your progress. Your space.</p></AuthFrame>;
}
