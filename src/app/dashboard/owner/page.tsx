"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { ShieldCheck, ShieldOff, Plus, X, Pencil } from "lucide-react";

export default function OwnerPage() {
  const supabase = createClient();
  const session = useSession();
  const [trainers, setTrainers] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  async function load() {
    const { data: types } = await supabase
      .from("account_types")
      .select("profile_id, type, profile:profiles(id, full_name, username, email, disabled)")
      .in("type", ["trainer", "owner"]);

    const map = new Map<string, any>();
    (types ?? []).forEach((t: any) => {
      const existing = map.get(t.profile_id) ?? { ...t.profile, roles: [] };
      existing.roles.push(t.type);
      map.set(t.profile_id, existing);
    });
    setTrainers(Array.from(map.values()));

    const { data: tok } = await supabase
      .from("register_tokens")
      .select("*")
      .eq("role", "trainer")
      .order("created_at", { ascending: false });
    setTokens(tok ?? []);

    // ALL clients across every trainer -- owner can see everything.
    const { data: clients } = await supabase
      .from("pt_clients")
      .select(
        "*, client:profiles!pt_clients_client_id_fkey(id, full_name, username, email, disabled, access_expires_at), pt:profiles!pt_clients_pt_id_fkey(full_name)"
      )
      .order("created_at", { ascending: false });
    setAllClients(clients ?? []);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  async function toggleDisabled(id: string, current: boolean) {
    await supabase.from("profiles").update({ disabled: !current }).eq("id", id);
    load();
  }

  function randomToken() {
    const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TMC-PT-${seg()}`;
  }

  async function generateTrainerToken() {
    await supabase.from("register_tokens").insert({
      token: randomToken(),
      role: "trainer",
      created_by: session.userId,
      max_uses: 1,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    });
    load();
  }

  async function removeTrainerRole(profileId: string) {
    if (!confirm("Remove trainer role from this account?")) return;
    await supabase.from("account_types").delete().eq("profile_id", profileId).eq("type", "trainer");
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Owner Dashboard</h1>
        <p className="text-neutral-400 text-sm">Manage every trainer and client across the studio.</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Invite a new Personal Trainer</h3>
          <button onClick={generateTrainerToken} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Generate PT token
          </button>
        </div>
        <div className="space-y-2">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-base-850 border border-base-border rounded-lg px-3 py-2 text-sm"
            >
              <span className="font-mono text-gold-400">{t.token}</span>
              <span className="text-xs text-neutral-500">
                {t.use_count}/{t.max_uses} used
                {t.expires_at ? ` · expires ${new Date(t.expires_at).toLocaleDateString()}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Trainers & Owners</h3>
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left border-b border-base-border">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Roles</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {trainers.map((t) => (
              <tr key={t.id} className="border-b border-base-border/50">
                <td className="py-2 font-medium">{t.full_name}</td>
                <td className="py-2 text-neutral-400">{t.email}</td>
                <td className="py-2">
                  <div className="flex gap-1 flex-wrap">
                    {t.roles.map((r: string) => (
                      <span key={r} className="badge badge-gold">
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2">
                  {t.disabled ? (
                    <span className="badge bg-red-900/30 text-red-300 border border-red-900">Disabled</span>
                  ) : (
                    <span className="badge bg-green-900/30 text-green-300 border border-green-900">Active</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditTarget(t)} className="text-neutral-400 hover:text-gold-400" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => toggleDisabled(t.id, t.disabled)}
                      className="text-neutral-400 hover:text-gold-400"
                      title={t.disabled ? "Enable" : "Disable"}
                    >
                      {t.disabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                    </button>
                    {t.roles.includes("trainer") && t.id !== session.userId && (
                      <button
                        onClick={() => removeTrainerRole(t.id)}
                        className="text-neutral-400 hover:text-red-400"
                        title="Remove trainer role"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">All clients (every trainer)</h3>
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left border-b border-base-border">
            <tr>
              <th className="py-2">Client</th>
              <th className="py-2">Email</th>
              <th className="py-2">Trainer</th>
              <th className="py-2">Access expires</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {allClients.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-neutral-500">
                  No clients yet.
                </td>
              </tr>
            )}
            {allClients.map((row) => (
              <tr key={row.id} className="border-b border-base-border/50">
                <td className="py-2 font-medium">{row.client?.full_name}</td>
                <td className="py-2 text-neutral-400">{row.client?.email}</td>
                <td className="py-2 text-neutral-400">{row.pt?.full_name}</td>
                <td className="py-2 text-neutral-400">
                  {row.client?.access_expires_at
                    ? new Date(row.client.access_expires_at).toLocaleDateString()
                    : "No expiry"}
                </td>
                <td className="py-2">
                  {row.client?.disabled ? (
                    <span className="badge bg-red-900/30 text-red-300 border border-red-900">Disabled</span>
                  ) : (
                    <span className="badge bg-green-900/30 text-green-300 border border-green-900">Active</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => setEditTarget(row.client)}
                    className="text-gold-400 hover:underline text-sm"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <EditAccountModal target={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />
      )}
    </div>
  );
}

function EditAccountModal({
  target,
  onClose,
  onSaved,
}: {
  target: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(target.full_name ?? "");
  const [username, setUsername] = useState(target.username ?? "");
  const [accessExpiresAt, setAccessExpiresAt] = useState(
    target.access_expires_at ? target.access_expires_at.slice(0, 10) : ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: target.id,
        fullName,
        username,
        accessExpiresAt: accessExpiresAt ? new Date(accessExpiresAt).toISOString() : null,
        ...(newPassword ? { newPassword } : {}),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg({ type: "err", text: json.error ?? "Something went wrong." });
      return;
    }
    setMsg({ type: "ok", text: "Saved." });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card p-5 w-full max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit account — {target.full_name}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">
            <X size={18} />
          </button>
        </div>
        {msg && <p className={`text-sm ${msg.type === "ok" ? "text-gold-400" : "text-red-400"}`}>{msg.text}</p>}
        <div>
          <label className="label-text">Full name</label>
          <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Username</label>
          <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Access expires on (blank = never)</label>
          <input
            type="date"
            className="input-field"
            value={accessExpiresAt}
            onChange={(e) => setAccessExpiresAt(e.target.value)}
          />
        </div>
        <div>
          <label className="label-text">Reset password (leave blank to skip)</label>
          <input
            type="password"
            className="input-field"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
