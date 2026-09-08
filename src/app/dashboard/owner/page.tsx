"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { ShieldCheck, ShieldOff, Plus, X } from "lucide-react";

export default function OwnerPage() {
  const supabase = createClient();
  const session = useSession();
  const [trainers, setTrainers] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);

  async function load() {
    // everyone with a 'trainer' or 'owner' account_type
    const { data: types } = await supabase
      .from("account_types")
      .select("profile_id, type, profile:profiles(id, full_name, email, disabled)")
      .in("type", ["trainer", "owner"]);

    // group by profile
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
        <p className="text-neutral-400 text-sm">Manage trainer accounts across the studio.</p>
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
    </div>
  );
}
