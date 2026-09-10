"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import Avatar from "@/components/Avatar";
import { X, ArrowUp, ArrowDown, Minus } from "lucide-react";

const MOOD_STYLE: Record<string, { bg: string; text: string }> = {
  Great: { bg: "rgba(74,222,128,0.12)", text: "#4ade80" },
  Good: { bg: "rgba(163,230,53,0.12)", text: "#a3e635" },
  Okay: { bg: "rgba(251,191,36,0.14)", text: "#fbbf24" },
  Tired: { bg: "rgba(251,146,60,0.12)", text: "#fb923c" },
  Rough: { bg: "rgba(248,113,113,0.12)", text: "#f87171" },
};

export default function CheckinsPage() {
  const supabase = createClient();
  const session = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any | null>(null);

  useEffect(() => {
    if (!session.userId) return;
    supabase
      .from("daily_logs")
      .select("*, client:profiles!daily_logs_client_id_fkey(full_name, avatar_url)")
      .eq("pt_id", session.userId)
      .order("log_date", { ascending: false })
      .limit(150)
      .then(({ data }) => setLogs(data ?? []));
  }, [session.userId]); // eslint-disable-line

  // Compute weight trend per row by comparing to that same client's next-most-recent log.
  const byClient: Record<string, any[]> = {};
  logs.forEach((l) => {
    byClient[l.client_id] = byClient[l.client_id] || [];
    byClient[l.client_id].push(l);
  });
  const trendFor = (log: any) => {
    const history = byClient[log.client_id] ?? [];
    const idx = history.findIndex((h) => h.id === log.id);
    const prev = history[idx + 1]; // list is newest-first, so next index is the older entry
    if (!prev || log.weight_kg == null || prev.weight_kg == null) return null;
    const diff = log.weight_kg - prev.weight_kg;
    if (Math.abs(diff) < 0.05) return { diff: 0 };
    return { diff };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Check-ins</h1>
        <p className="text-neutral-400 text-sm">Every daily log from all of your clients, most recent first.</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-850/60 text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Weight</th>
              <th className="px-4 py-3 font-medium">Mood</th>
              <th className="px-4 py-3 font-medium">Calories</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-neutral-500">
                  No check-ins logged yet.
                </td>
              </tr>
            )}
            {logs.map((l) => {
              const mood = MOOD_STYLE[l.mood] ?? { bg: "rgba(255,255,255,0.04)", text: "#a3a3a3" };
              const trend = trendFor(l);
              return (
                <tr key={l.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar url={l.client?.avatar_url} name={l.client?.full_name} size={24} />
                      <span className="font-medium">{l.client?.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{l.log_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-200">{l.weight_kg ? `${l.weight_kg}kg` : "—"}</span>
                      {trend && trend.diff !== 0 && (
                        <span className={trend.diff > 0 ? "text-red-400" : "text-green-400"} title={`${trend.diff > 0 ? "+" : ""}${trend.diff.toFixed(1)}kg since last log`}>
                          {trend.diff > 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                        </span>
                      )}
                      {trend && trend.diff === 0 && <Minus size={12} className="text-neutral-600" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {l.mood ? (
                      <span className="badge" style={{ background: mood.bg, color: mood.text, borderColor: "transparent" }}>
                        {l.mood}
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{l.calories ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-400 max-w-xs truncate">{l.training_notes || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setViewing(l)} className="text-gold-300 hover:underline text-sm">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500 flex items-center gap-4">
        <span className="flex items-center gap-1"><ArrowDown size={12} className="text-green-400" /> Weight down since last log</span>
        <span className="flex items-center gap-1"><ArrowUp size={12} className="text-red-400" /> Weight up since last log</span>
      </p>

      {viewing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-5 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar url={viewing.client?.avatar_url} name={viewing.client?.full_name} size={28} />
                <div>
                  <p className="font-semibold">{viewing.client?.full_name}</p>
                  <p className="text-xs text-neutral-500">{viewing.log_date}</p>
                </div>
              </div>
              <button onClick={() => setViewing(null)} className="text-neutral-400 hover:text-neutral-200">
                <X size={18} />
              </button>
            </div>
            {viewing.mood && (
              <span
                className="badge"
                style={{
                  background: (MOOD_STYLE[viewing.mood] ?? { bg: "rgba(255,255,255,0.04)" }).bg,
                  color: (MOOD_STYLE[viewing.mood] ?? { text: "#a3a3a3" }).text,
                  borderColor: "transparent",
                }}
              >
                Feeling: {viewing.mood}
              </span>
            )}
            <div className="grid grid-cols-5 gap-2 text-sm text-neutral-300">
              <div>
                <p className="text-xs text-neutral-500">Weight</p>
                {viewing.weight_kg ? `${viewing.weight_kg}kg` : "—"}
              </div>
              <div>
                <p className="text-xs text-neutral-500">Calories</p>
                {viewing.calories ?? "—"}
              </div>
              <div>
                <p className="text-xs text-neutral-500">Protein</p>
                {viewing.protein ?? "—"}g
              </div>
              <div>
                <p className="text-xs text-neutral-500">Carbs</p>
                {viewing.carbs ?? "—"}g
              </div>
              <div>
                <p className="text-xs text-neutral-500">Fats</p>
                {viewing.fats ?? "—"}g
              </div>
            </div>
            {viewing.training_notes && (
              <div>
                <p className="text-xs text-neutral-500 mb-1">Notes</p>
                <p className="text-sm text-neutral-200">{viewing.training_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
