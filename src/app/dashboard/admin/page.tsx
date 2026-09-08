"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Copy, Plus, Trash2 } from "lucide-react";

function randomToken() {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TMC-${seg()}-${seg()}`;
}

export default function AdminPage() {
  const supabase = createClient();
  const session = useSession();
  const [tokens, setTokens] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [maxUses, setMaxUses] = useState("1");
  const [accessDays, setAccessDays] = useState("30");

  async function load() {
    if (!session.userId) return;
    const { data: t } = await supabase
      .from("register_tokens")
      .select("*")
      .eq("pt_id", session.userId)
      .order("created_at", { ascending: false });
    setTokens(t ?? []);

    const { data: c } = await supabase
      .from("pt_clients")
      .select("*, client:profiles!pt_clients_client_id_fkey(full_name, email)")
      .eq("pt_id", session.userId);
    setClients(c ?? []);
  }

  useEffect(() => {
    load();
  }, [session.userId]); // eslint-disable-line

  async function generateToken() {
    const token = randomToken();
    const expires_at = expiresInDays
      ? new Date(Date.now() + Number(expiresInDays) * 86400000).toISOString()
      : null;
    await supabase.from("register_tokens").insert({
      token,
      role: "client",
      pt_id: session.userId,
      created_by: session.userId,
      max_uses: Number(maxUses) || 1,
      access_days: accessDays ? Number(accessDays) : null,
      expires_at,
    });
    load();
  }

  async function deleteToken(id: string) {
    await supabase.from("register_tokens").delete().eq("id", id);
    load();
  }

  async function removeClient(ptClientId: string) {
    if (!confirm("Remove this client from your roster? Their account remains, but they'll be unassigned.")) return;
    await supabase.from("pt_clients").delete().eq("id", ptClientId);
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">PT Admin</h1>
        <p className="text-neutral-400 text-sm">Manage your clients and invite new ones with a token.</p>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Generate a registration token</h3>
        <p className="text-sm text-neutral-400">
          Share this token with a new client — when they register with it, they'll automatically be assigned to you
          and granted the access duration below (their account is <em>frozen</em>, not deleted, once that runs out —
          you can always extend it later from their Details tab).
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label-text">Token expires in (days)</label>
            <input
              className="input-field w-36"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
            <p className="text-[10px] text-neutral-500 mt-1">How long the token itself stays redeemable.</p>
          </div>
          <div>
            <label className="label-text">Client access duration (days)</label>
            <input className="input-field w-36" value={accessDays} onChange={(e) => setAccessDays(e.target.value)} />
            <p className="text-[10px] text-neutral-500 mt-1">Blank = unlimited access.</p>
          </div>
          <div>
            <label className="label-text">Max uses</label>
            <input className="input-field w-24" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <button onClick={generateToken} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Generate token
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {tokens.length === 0 && <p className="text-sm text-neutral-500">No tokens generated yet.</p>}
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-base-850 border border-base-border rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-gold-400 text-sm">{t.token}</span>
                <span className="text-xs text-neutral-500">
                  {t.use_count}/{t.max_uses} used
                  {t.expires_at ? ` · expires ${new Date(t.expires_at).toLocaleDateString()}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(t.token)}
                  className="text-neutral-400 hover:text-gold-400"
                  title="Copy"
                >
                  <Copy size={15} />
                </button>
                <button onClick={() => deleteToken(t.id)} className="text-neutral-400 hover:text-red-400" title="Revoke">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Your clients</h3>
        <div className="space-y-2">
          {clients.length === 0 && <p className="text-sm text-neutral-500">No clients assigned to you yet.</p>}
          {clients.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-base-850 border border-base-border rounded-lg px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{c.client?.full_name}</p>
                <p className="text-neutral-500 text-xs">{c.client?.email}</p>
              </div>
              <button onClick={() => removeClient(c.id)} className="text-neutral-400 hover:text-red-400">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
