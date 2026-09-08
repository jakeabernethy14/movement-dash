"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { format } from "date-fns";

const MOODS = ["Great", "Good", "Okay", "Tired", "Rough"];

export default function DailyLogPage() {
  const supabase = createClient();
  const session = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    training_notes: "",
    mood: "",
  });
  const [saved, setSaved] = useState(false);

  async function load() {
    if (!session.userId) return;
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", session.userId)
      .order("log_date", { ascending: false })
      .limit(30);
    setLogs(data ?? []);
    const todayLog = (data ?? []).find((l) => l.log_date === today);
    if (todayLog) {
      setForm({
        calories: todayLog.calories?.toString() ?? "",
        protein: todayLog.protein?.toString() ?? "",
        carbs: todayLog.carbs?.toString() ?? "",
        fats: todayLog.fats?.toString() ?? "",
        training_notes: todayLog.training_notes ?? "",
        mood: todayLog.mood ?? "",
      });
    }
  }

  useEffect(() => {
    load();
  }, [session.userId]); // eslint-disable-line

  async function saveToday() {
    if (!session.userId) return;
    await supabase.from("daily_logs").upsert(
      {
        client_id: session.userId,
        log_date: today,
        calories: Number(form.calories) || null,
        protein: Number(form.protein) || null,
        carbs: Number(form.carbs) || null,
        fats: Number(form.fats) || null,
        training_notes: form.training_notes,
        mood: form.mood || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,log_date" }
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Log</h1>
        <p className="text-neutral-400 text-sm">Log today's nutrition and training — your PT can see this.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold">Today — {format(new Date(), "EEEE d MMMM")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {(["calories", "protein", "carbs", "fats"] as const).map((k) => (
              <div key={k}>
                <label className="label-text">{k === "calories" ? "Calories" : `${k} (g)`}</label>
                <input
                  type="number"
                  className="input-field"
                  value={(form as any)[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="label-text">How are you feeling?</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setForm({ ...form, mood: m })}
                  className={`badge border ${
                    form.mood === m
                      ? "bg-gold-400/15 text-gold-300 border-gold-400/40"
                      : "bg-base-800 text-neutral-400 border-base-border"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-text">Training notes</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="What did you train today? How did it feel?"
              value={form.training_notes}
              onChange={(e) => setForm({ ...form, training_notes: e.target.value })}
            />
          </div>
          <button onClick={saveToday} className="btn-primary w-full">
            {saved ? "Saved ✓" : "Save today's log"}
          </button>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">History</h3>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {logs.length === 0 && <p className="text-sm text-neutral-500">No logs yet.</p>}
            {logs.map((l) => (
              <div key={l.id} className="bg-base-850 border border-base-border rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{l.log_date}</span>
                  {l.mood && <span className="badge badge-gold">{l.mood}</span>}
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-neutral-400 mb-1">
                  <span>Cal: {l.calories ?? "—"}</span>
                  <span>P: {l.protein ?? "—"}g</span>
                  <span>C: {l.carbs ?? "—"}g</span>
                  <span>F: {l.fats ?? "—"}g</span>
                </div>
                {l.training_notes && <p className="text-neutral-300">{l.training_notes}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
