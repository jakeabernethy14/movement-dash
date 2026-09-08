"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Search, ChevronRight } from "lucide-react";

interface Row {
  id: string;
  description: string;
  expiration: string | null;
  status: string;
  client: { id: string; full_name: string; email: string } | null;
}

export default function ClientsPage() {
  const supabase = createClient();
  const session = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.userId) return;
    async function load() {
      // Owner sees all clients; trainer sees only their own.
      let query = supabase
        .from("pt_clients")
        .select("id, description, expiration, status, client:profiles!pt_clients_client_id_fkey(id, full_name, email)")
        .order("created_at", { ascending: false });

      if (!session.isOwner) query = query.eq("pt_id", session.userId);

      const { data } = await query;
      setRows((data as any) ?? []);
      setLoading(false);
    }
    load();
  }, [session.userId, session.isOwner]); // eslint-disable-line

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.client?.full_name?.toLowerCase().includes(q) ||
      r.client?.email?.toLowerCase().includes(q)
    );
  });

  function expirationBadge(exp: string | null) {
    if (!exp) return <span className="text-neutral-500 text-sm">—</span>;
    const daysLeft = Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
    const color =
      daysLeft < 0
        ? "bg-red-900/30 text-red-300 border-red-900"
        : daysLeft <= 7
        ? "bg-gold-500/15 text-gold-400 border-gold-500/30"
        : "bg-base-800 text-neutral-300 border-base-border";
    return (
      <span className={`badge border ${color}`}>
        {new Date(exp).toLocaleDateString()}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-neutral-400 text-sm">
            {session.isOwner ? "All clients across trainers." : "Clients assigned to you."}
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-neutral-500" />
          <input
            className="input-field pl-9 w-64"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-850 text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Client name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Expiration</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={5}>
                  No clients found. Generate a registration token in PT Admin to invite one.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-base-border hover:bg-base-850/60">
                <td className="px-4 py-3 font-medium">{r.client?.full_name}</td>
                <td className="px-4 py-3 text-neutral-400">{r.client?.email}</td>
                <td className="px-4 py-3 text-neutral-400 max-w-xs truncate">
                  {r.description || "—"}
                </td>
                <td className="px-4 py-3">{expirationBadge(r.expiration)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/clients/${r.client?.id}`}
                    className="inline-flex items-center gap-1 text-gold-400 hover:underline text-sm"
                  >
                    Manage <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
