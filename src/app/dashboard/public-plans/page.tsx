"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { exportTrainingPlanPDF } from "@/lib/pdf";
import { Download, X, Globe } from "lucide-react";

export default function PublicPlansPage() {
  const supabase = createClient();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("training_plans")
      .select("*, author:profiles!training_plans_pt_id_fkey(full_name, avatar_url)")
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setPlans(data ?? []);
        setLoading(false);
      });
  }, []); // eslint-disable-line

  const filtered = plans.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe size={20} className="text-gold-300" /> Public Training Plans
          </h1>
          <p className="text-neutral-400 text-sm">Plans any trainer has chosen to share with the whole studio.</p>
        </div>
        <input
          className="input-field w-64"
          placeholder="Search plans…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-850/60 text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Created by</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-neutral-500">Loading…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-neutral-500">
                  No public training plans yet.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3 text-neutral-400 max-w-sm truncate">{p.description || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar url={p.author?.avatar_url} name={p.author?.full_name} size={22} />
                    <span className="text-neutral-300">{p.author?.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => setViewing(p)} className="text-gold-300 hover:underline text-sm mr-3">
                    Click to view
                  </button>
                  <button
                    onClick={() => exportTrainingPlanPDF(p)}
                    className="text-neutral-400 hover:text-gold-300"
                    title="Export PDF"
                  >
                    <Download size={15} className="inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{viewing.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar url={viewing.author?.avatar_url} name={viewing.author?.full_name} size={20} />
                  <span className="text-xs text-neutral-500">by {viewing.author?.full_name}</span>
                </div>
              </div>
              <button onClick={() => setViewing(null)} className="text-neutral-400 hover:text-neutral-200">
                <X size={18} />
              </button>
            </div>
            {viewing.description && <p className="text-sm text-neutral-300">{viewing.description}</p>}
            <div className="space-y-3">
              {(viewing.content ?? []).map((day: any, i: number) => (
                <div key={i} className="bg-base-850 border border-white/[0.06] rounded-lg p-3">
                  <p className="font-medium text-sm mb-2">{day.day}</p>
                  <table className="w-full text-xs">
                    <thead className="text-neutral-500 text-left">
                      <tr>
                        <th className="pb-1">Exercise</th>
                        <th className="pb-1">Sets</th>
                        <th className="pb-1">Reps</th>
                        <th className="pb-1">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-300">
                      {(day.exercises ?? []).map((ex: any, j: number) => (
                        <tr key={j}>
                          <td className="py-0.5">{ex.name}</td>
                          <td className="py-0.5">{ex.sets}</td>
                          <td className="py-0.5">{ex.reps}</td>
                          <td className="py-0.5">{ex.weight || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <button
              onClick={() => exportTrainingPlanPDF(viewing)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
