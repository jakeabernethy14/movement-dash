"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";
export default function ResetPasswordPage() {
  const supabase = createClient();
  const [ready, setReady] = useState(false); const [loading, setLoading] = useState(true); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [visible, setVisible] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error")) { setError("This recovery link has expired or could not be verified. Please request a new link and open it in the same browser."); setLoading(false); return; }
    supabase.auth.getUser().then(({ data, error }) => { setReady(!!data.user && !error); if (!data.user || error) setError("Open the link from your recovery email, or request a fresh link below."); setLoading(false); }).catch(() => { setError("We could not verify your recovery link. Check your connection and request a new link."); setLoading(false); });
  }, [supabase]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!ready || saving) return;
    if (password !== confirm) { setError("Your passwords don't match. Please try again."); return; }
    setSaving(true); setError("");
    try { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; setDone(true); }
    catch (err) { setError(err instanceof Error ? err.message : "We couldn't update your password. Please try again."); }
    finally { setSaving(false); }
  }
  return <AuthFrame title={done ? "You're good to go." : "Make it a strong one."} description={done ? "Your password has been updated." : "Set a new password to get back to your coaching."} label="RESET YOUR PASSWORD">{error && <div className="error-banner" role="alert">{error}</div>}{loading ? <p className="muted">Checking your recovery link...</p> : done ? <div className="auth-success"><CheckCircle2 size={28}/><Link className="btn-primary auth-submit mt-5" href="/dashboard">Back to my dashboard<ArrowRight size={15}/></Link></div> : ready ? <form onSubmit={submit} className="auth-form"><div><label htmlFor="new-password" className="label-text">New password (at least 8 characters)</label><div className="relative"><input id="new-password" type={visible ? "text" : "password"} minLength={8} required autoComplete="new-password" className="input-field pr-12" value={password} onChange={e => setPassword(e.target.value)}/><button type="button" className="password-toggle" onClick={() => setVisible(v => !v)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div><div><label htmlFor="confirm-password" className="label-text">Confirm new password</label><input id="confirm-password" type={visible ? "text" : "password"} minLength={8} required autoComplete="new-password" className="input-field" value={confirm} onChange={e => setConfirm(e.target.value)}/></div><button className="btn-primary auth-submit" disabled={saving}>{saving ? "Updating..." : "Update password"}<ArrowRight size={15}/></button></form> : <Link href="/forgot-password" className="btn-primary auth-submit">Request a new recovery link<ArrowRight size={14}/></Link>}</AuthFrame>;
}
