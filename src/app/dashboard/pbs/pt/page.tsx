"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Trophy } from "lucide-react";

export default function PtPbsPage() {
  const supabase = createClient();
  const session = useSession();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [pbs, setPbs] = useState<any[]>([]);

  useEffect(() => {
    if (!session.userId) return;
    supabase
      .from("pt_clients")
      .select("client:profiles!pt_clients_client_id_fkey(id, full_name)")
      .eq("pt_id", session.userId)
      .then(({ data }) => {
        const list = (data ?? []).map((r: any) => r.client).filter(Boolean);
        setClients(list);
        if (list[0]) setSelectedClient(list[0].id);
      });
  }, [session.userId]); // eslint-disable-line

  useEffect(() => {
    if (!selectedClient) return;
    supabase
      .from("personal_bests")
      .select("*")
      .eq("client_id", selectedClient)
      .order("pb_date", { ascending: false })
      .then(({ data }) => setPbs(data ?? []));
  }, [selectedClient]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy size={20} className="text-gold-300" /> Personal Bests
          </h1>
          <p className="text-neutral-400 text-sm">View any client's logged PRs.</p>
        </div>
        <select className="input-field w-56" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
          {clients.length === 0 && <option value="">No clients yet</option>}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-850/60 text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Exercise</th>
              <th className="px-4 py-3 font-medium">Weight</th>
              <th className="px-4 py-3 font-medium">Reps / Time</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {pbs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-neutral-500">
                  No PBs logged yet for this client.
                </td>
              </tr>
            )}
            {pbs.map((pb) => (
              <tr key={pb.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">{pb.exercise}</td>
                <td className="px-4 py-3 text-gold-300">{pb.weight || "—"}</td>
                <td className="px-4 py-3 text-neutral-300">{pb.reps_or_time || "—"}</td>
                <td className="px-4 py-3 text-neutral-400">{pb.pb_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
