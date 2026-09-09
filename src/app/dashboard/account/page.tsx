"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Camera } from "lucide-react";

export default function AccountPage() {
  const supabase = createClient();
  const session = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!session.profile) return;
    setFullName(session.profile.full_name ?? "");
    setUsername(session.profile.username ?? "");
    setBio(session.profile.bio ?? "");
    setAvatarUrl(session.profile.avatar_url ?? null);
  }, [session.profile]);

  async function saveProfile() {
    if (!session.userId) return;
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, username: username || null, bio })
      .eq("id", session.userId);
    if (error) {
      setMsg({ type: "err", text: error.message.includes("duplicate") ? "That username is already taken." : error.message });
      return;
    }
    setMsg({ type: "ok", text: "Profile updated." });
  }

  async function savePassword() {
    if (!newPassword) return;
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }
    setNewPassword("");
    setMsg({ type: "ok", text: "Password updated." });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session.userId) return;
    setUploading(true);
    setMsg(null);

    const ext = file.name.split(".").pop();
    const path = `${session.userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setMsg({
        type: "err",
        text:
          "Couldn't upload image. Make sure the 'avatars' storage bucket exists (see README / migration_002.sql). " +
          uploadError.message,
      });
      return;
    }

    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    const bustCache = `${publicUrl.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: bustCache }).eq("id", session.userId);
    setAvatarUrl(bustCache);
    setUploading(false);
    setMsg({ type: "ok", text: "Profile picture updated." });
  }

  if (session.loading) return <p className="text-neutral-500">Loading…</p>;

  const initials = (fullName || session.profile?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-neutral-400 text-sm">Your profile, visible to your {session.isClient ? "trainer" : "clients"}.</p>
      </div>

      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-gold-400" : "text-red-400"}`}>{msg.text}</p>
      )}

      <div className="card p-4 flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-base-border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gold-400/15 border border-gold-400/30 flex items-center justify-center text-gold-300 text-xl font-semibold">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold-400 text-base-950 flex items-center justify-center shadow-[0_0_12px_-2px_rgba(212,175,55,0.75)]"
            title="Change photo"
          >
            <Camera size={13} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="font-medium">{fullName || session.profile?.email}</p>
          <p className="text-sm text-neutral-500">{session.roles.join(" · ")}</p>
          {uploading && <p className="text-xs text-gold-400 mt-1">Uploading…</p>}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Profile</h3>
        <div>
          <label className="label-text">Full name</label>
          <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Username</label>
          <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Used to log in instead of email" />
        </div>
        <div>
          <label className="label-text">Bio</label>
          <textarea className="input-field resize-none" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <button onClick={saveProfile} className="btn-primary">
          Save profile
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Password</h3>
        <input
          type="password"
          className="input-field"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button onClick={savePassword} disabled={!newPassword} className="btn-primary">
          Update password
        </button>
      </div>
    </div>
  );
}
