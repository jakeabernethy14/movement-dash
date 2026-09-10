"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Search, ChevronRight, MessageCircle, NotebookPen, Activity } from "lucide-react";
import { format, subDays } from "date-fns";

interface Row {
  id: string;
  description: string;
  status: string;
  client: { id: string; full_name: string; email: string; access_expires_at: string | null } | null;
}

export default function ClientsPage() {
  const supabase = createClient();
  const session = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [activity, setActivity] = useState<Record<string, { newMessage: boolean; newLog: boolean; newResponse: boolean }>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.userId) return;
    async function load() {
      // This tab always shows only the current account's OWN clients (as a trainer).
      // Owners can see every client across every trainer on the dedicated Owner page.
      const { data } = await supabase
        .from("pt_clients")
        .select("id, description, status, client:profiles!pt_clients_client_id_fkey(id, full_name, email, access_expires_at)")
        .eq("pt_id", session.userId)
        .order("created_at", { ascending: false });
      const list = (data as any) ?? [];
      setRows(list);
      setLoading(false);

      const clientIds = list.map((r: Row) => r.client?.id).filter(Boolean);
      if (clientIds.length === 0) return;

      const since = format(subDays(new Date(), 2), "yyyy-MM-dd");
      const sinceIso = subDays(new Date(), 2).toISOString();

      const [{ data: unreadMsgs }, { data: recentLogs }, { data: recentResponses }] = await Promise.all([
        supabase
          .from("messages")
          .select("sender_id")
          .in("sender_id", clientIds)
          .eq("recipient_id", session.userId)
          .eq("read", false),
        supabase.from("daily_logs").select("client_id").in("client_id", clientIds).gte("log_date", since),
        supabase
          .from("schedule_events")
          .select("client_id")
          .in("client_id", clientIds)
          .not("client_response", "is", null)
          .gte("responded_at", sinceIso),
      ]);

      const map: Record<string, { newMessage: boolean; newLog: boolean; newResponse: boolean }> = {};
      clientIds.forEach((id: string) => (map[id] = { newMessage: false, newLog: false, newResponse: false }));
      (unreadMsgs ?? []).forEach((m: any) => { if (map[m.sender_id]) map[m.sender_id].newMessage = true; });
      (recentLogs ?? []).forEach((l: any) => { if (map[l.client_id]) map[l.client_id].newLog = true; });
      (recentResponses ?? []).forEach((r: any) => { if (map[r.client_id]) map[r.client_id].newResponse = true; });
      setActivity(map);
    }
    load();
  }, [session.userId]); // eslint-disable-line

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.client?.full_name?.toLowerCase().includes(q) ||
      r.client?.email?.toLowerCase().includes(q)
    );
  });

  function isExpired(exp: string | null) {
    return !!exp && new Date(exp) < new Date();
  }

  function expirationBadge(exp: string | null) {
    if (!exp) return <span className="text-neutral-500 text-sm">No expiry</span>;
    const expired = isExpired(exp);
    return (
      <span
        className="badge"
        style={{
          background: expired ? "rgba(248,113,113,0.12)" : "rgba(74,222,128,0.12)",
          color: expired ? "#f87171" : "#4ade80",
          borderColor: "transparent",
        }}
      >
        {new Date(exp).toLocaleDateString()}
      </span>
    );
  }

  function statusBadge(row: Row) {
    const expired = isExpired(row.client?.access_expires_at ?? null);
    const status = expired ? "expired" : row.status;
    const style =
      status === "expired"
        ? { background: "rgba(248,113,113,0.12)", color: "#f87171" }
        : status === "paused"
        ? { background: "rgba(251,191,36,0.12)", color: "#fbbf24" }
        : { background: "rgba(74,222,128,0.12)", color: "#4ade80" };
    return (
      <span className="badge capitalize" style={{ ...style, borderColor: "transparent" }}>
        {status}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-neutral-400 text-sm">Clients assigned to you.</p>
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
          <thead className="bg-base-850/60 text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Client name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expiration</th>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={7}>
                  No clients found. Generate a registration token in PT Admin to invite one.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const act = r.client?.id ? activity[r.client.id] : undefined;
              return (
                <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium">{r.client?.full_name}</td>
                  <td className="px-4 py-3 text-neutral-400">{r.client?.email}</td>
                  <td className="px-4 py-3 text-neutral-400 max-w-xs truncate">
                    {r.description || "—"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(r)}</td>
                  <td className="px-4 py-3">{expirationBadge(r.client?.access_expires_at ?? null)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {act?.newMessage && (
                        <span title="New message" className="text-gold-300"><MessageCircle size={15} /></span>
                      )}
                      {act?.newLog && (
                        <span title="New daily log" className="text-green-400"><NotebookPen size={15} /></span>
                      )}
                      {act?.newResponse && (
                        <span title="New session result" className="text-blue-400"><Activity size={15} /></span>
                      )}
                      {!act?.newMessage && !act?.newLog && !act?.newResponse && (
                        <span className="text-neutral-700 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/clients/${r.client?.id}`}
                      className="inline-flex items-center gap-1 text-gold-300 hover:underline text-sm"
                    >
                      Manage <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500 flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1"><MessageCircle size={12} className="text-gold-300" /> Unread message</span>
        <span className="flex items-center gap-1"><NotebookPen size={12} className="text-green-400" /> Logged in last 2 days</span>
        <span className="flex items-center gap-1"><Activity size={12} className="text-blue-400" /> New session result</span>
      </p>
    </div>
  );
}
