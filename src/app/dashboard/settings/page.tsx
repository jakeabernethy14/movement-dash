"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<{
    allow_registration: boolean;
    require_email_verification: boolean;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => setSettings(data));
  }, []); // eslint-disable-line

  async function update(field: "allow_registration" | "require_email_verification", value: boolean) {
    if (!settings) return;
    const next = { ...settings, [field]: value };
    setSettings(next);
    await supabase.from("app_settings").update({ [field]: value }).eq("id", 1);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  if (!settings) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-neutral-400 text-sm">Studio-wide configuration. Owner only.</p>
      </div>

      <div className="card p-4 divide-y divide-base-border">
        <ToggleRow
          title="Allow public registration"
          description="When off, the Register page is hidden and new sign-ups (even with a valid token) are blocked."
          checked={settings.allow_registration}
          onChange={(v) => update("allow_registration", v)}
        />
        <ToggleRow
          title="Require email verification"
          description="When off, new accounts can sign in immediately without confirming their email. Configure the matching setting in Supabase Auth settings too (Authentication → Providers → Email → Confirm email)."
          checked={settings.require_email_verification}
          onChange={(v) => update("require_email_verification", v)}
        />
      </div>

      {saved && <p className="text-sm text-gold-400">Saved ✓</p>}

      <div className="card p-4 text-sm text-neutral-400 space-y-2">
        <p className="font-medium text-neutral-200">Note on email verification</p>
        <p>
          This toggle stores your preference in the database so it's visible in the app, but Supabase's
          actual "Confirm email" behavior is controlled in your Supabase Dashboard under{" "}
          <span className="text-gold-400">Authentication → Sign In / Providers → Email</span>. Turn "Confirm
          email" off there to fully disable verification emails.
        </p>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="py-4 flex items-start justify-between gap-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-neutral-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${
          checked ? "bg-gold-500" : "bg-base-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-base-950 transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
