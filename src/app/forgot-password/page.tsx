"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [sending, setSending] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (sending) return; setSending(true); setError("");
    try { const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback` }); if (error) throw error; setSent(true); }
    catch { setError("We couldn't send a recovery email. Please try again or contact your coach."); }
    finally { setSending(false); }
  }
  return <AuthFrame title={sent ? "Check your inbox." : "A fresh start."} description={sent ? "The next step is on its way." : "Enter your account email and we'll send you a password reset link."} label="ACCOUNT RECOVERY">{sent ? <div className="auth-success"><CheckCircle2 size={28}/><p>If an account exists for that address, you'll receive a recovery link. Check your spam folder too.</p><p>Open the link in this browser to finish resetting your password.</p><button className="btn-secondary mt-4" onClick={() => setSent(false)}>Use another email</button></div> : <form onSubmit={submit} className="auth-form">{error && <div className="error-banner" role="alert">{error}</div>}<label htmlFor="recovery-email" className="label-text">Email address</label><input id="recovery-email" required type="email" autoComplete="email" className="input-field" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}/><button className="btn-primary auth-submit" disabled={sending}>{sending ? <Loader2 className="animate-spin" size={16}/> : <ArrowRight size={16}/>}Send recovery link</button></form>}<Link href="/" className="auth-back-link"><ArrowLeft size={13}/>Back to sign in</Link></AuthFrame>;
}
