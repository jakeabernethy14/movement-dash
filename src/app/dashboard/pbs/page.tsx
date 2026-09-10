"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Plus, Trophy, Trash2 } from "lucide-react";

export default function PbsPage() {
  const supabase = createClient();
  const session = useSession();
  const [pbs, setPbs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    exercise: "",
    weight: "",
    reps_or_time: "",
    pb_date: new Date().toISOString().slice(0, 10),
  });

  async function load() {
    if (!session.userId) return;
    const { data } = await supabase
      .from("personal_bests")
      .select("*")
      .eq("client_id", session.userId)
      .order("pb_date", { ascending: false });
    setPbs(data ?? []);
  }

  useEffect(() => {
    load();
  }, [session.userId]); // eslint-disable-line

  async function addPb() {
    if (!session.userId || !form.exercise.trim()) return;
    await supabase.from("personal_bests").insert({
      client_id: session.userId,
      exercise: form.exercise.trim(),
      weight: form.weight,
      reps_or_time: form.reps_or_time,
      pb_date: form.pb_date,
    });
    setForm({ exercise: "", weight: "", reps_or_time: "", pb_date: new Date().toISOString().slice(0, 10) });
    setShowForm(false);
    load();
  }

  async function deletePb(id: string) {
    await supabase.from("personal_bests").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy size={20} className="text-gold-300" /> Personal Bests
          </h1>
          <p className="text-neutral-400 text-sm">Track your PRs over time.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add new PB
        </button>
      </div>

      {showForm && (
        <div className="card p-4 grid sm:grid-cols-2 md:grid-cols-4 gap-3 items-end max-w-3xl">
          <div>
            <label className="label-text">Exercise</label>
            <input
              className="input-field"
              placeholder="e.g. Back Squat"
              value={form.exercise}
              onChange={(e) => setForm({ ...form, exercise: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Weight</label>
            <input
              className="input-field"
              placeholder="e.g. 120kg"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Reps / Time</label>
            <input
              className="input-field"
              placeholder="e.g. 1 rep, or 4:32"
              value={form.reps_or_time}
              onChange={(e) => setForm({ ...form, reps_or_time: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Date</label>
            <input
              type="date"
              className="input-field"
              value={form.pb_date}
              onChange={(e) => setForm({ ...form, pb_date: e.target.value })}
            />
          </div>
          <button onClick={addPb} className="btn-primary sm:col-span-2 md:col-span-4">
            Save PB
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-850/60 text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Exercise</th>
              <th className="px-4 py-3 font-medium">Weight</th>
              <th className="px-4 py-3 font-medium">Reps / Time</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {pbs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-neutral-500">
                  No PBs logged yet — add your first one above.
                </td>
              </tr>
            )}
            {pbs.map((pb) => (
              <tr key={pb.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">{pb.exercise}</td>
                <td className="px-4 py-3 text-gold-300">{pb.weight || "—"}</td>
                <td className="px-4 py-3 text-neutral-300">{pb.reps_or_time || "—"}</td>
                <td className="px-4 py-3 text-neutral-400">{pb.pb_date}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deletePb(pb.id)} className="text-neutral-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
