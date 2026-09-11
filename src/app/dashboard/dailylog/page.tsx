"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { format } from "date-fns";
import { Pencil } from "lucide-react";

const MOODS = ["Great", "Good", "Okay", "Tired", "Rough"];

const MOOD_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Great: { bg: "rgba(74,222,128,0.10)", text: "#4ade80", border: "rgba(74,222,128,0.35)" },
  Good: { bg: "rgba(163,230,53,0.10)", text: "#a3e635", border: "rgba(163,230,53,0.3)" },
  Okay: { bg: "rgba(251,191,36,0.10)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  Tired: { bg: "rgba(251,146,60,0.10)", text: "#fb923c", border: "rgba(251,146,60,0.3)" },
  Rough: { bg: "rgba(248,113,113,0.10)", text: "#f87171", border: "rgba(248,113,113,0.35)" },
};

const emptyForm = {
  log_date: format(new Date(), "yyyy-MM-dd"),
  weight_kg: "",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  sleep_hours: "",
  energy_level: "",
  stress_level: "",
  notes: "",
  mood: "",
};

export default function DailyLogPage() {
  const supabase = createClient();
  const session = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [saved, setSaved] = useState(false);
  const [editingExisting, setEditingExisting] = useState(false);

  async function load() {
    if (!session.userId) return;
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", session.userId)
      .order("log_date", { ascending: false })
      .limit(30);
    setLogs(data ?? []);
  }

  useEffect(() => {
    load();
  }, [session.userId]); // eslint-disable-line

  function loadIntoForm(log: any) {
    setForm({
      log_date: log.log_date,
      weight_kg: log.weight_kg?.toString() ?? "",
      calories: log.calories?.toString() ?? "",
      protein: log.protein?.toString() ?? "",
      carbs: log.carbs?.toString() ?? "",
      fats: log.fats?.toString() ?? "",
      sleep_hours: log.sleep_hours?.toString() ?? "",
      energy_level: log.energy_level?.toString() ?? "",
      stress_level: log.stress_level?.toString() ?? "",
      notes: log.training_notes ?? "",
      mood: log.mood ?? "",
    });
    setEditingExisting(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveLog() {
    if (!session.userId) return;
    await supabase.from("daily_logs").upsert(
      {
        client_id: session.userId,
        log_date: form.log_date,
        weight_kg: Number(form.weight_kg) || null,
        calories: Number(form.calories) || null,
        protein: Number(form.protein) || null,
        carbs: Number(form.carbs) || null,
        fats: Number(form.fats) || null,
        sleep_hours: Number(form.sleep_hours) || null,
        energy_level: Number(form.energy_level) || null,
        stress_level: Number(form.stress_level) || null,
        training_notes: form.notes,
        mood: form.mood || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,log_date" }
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    load();
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingExisting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Log</h1>
        <p className="text-neutral-400 text-sm">Log your nutrition, weight and training — your PT can see this.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {editingExisting ? `Editing ${form.log_date}` : `Today — ${format(new Date(), "EEEE d MMMM")}`}
            </h3>
            {editingExisting && (
              <button onClick={resetForm} className="text-xs text-gold-300 hover:underline">
                Log today instead
              </button>
            )}
          </div>
          {editingExisting && (
            <div>
              <label className="label-text">Date</label>
              <input
                type="date"
                className="input-field"
                value={form.log_date}
                onChange={(e) => setForm({ ...form, log_date: e.target.value })}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input-field"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text">Calories</label>
              <input
                type="number"
                className="input-field"
                value={form.calories}
                onChange={(e) => setForm({ ...form, calories: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["protein", "carbs", "fats"] as const).map((k) => (
              <div key={k}>
                <label className="label-text">{k} (g)</label>
                <input
                  type="number"
                  className="input-field"
                  value={(form as any)[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-text">Sleep (hrs)</label>
              <input
                type="number"
                step="0.5"
                className="input-field"
                value={form.sleep_hours}
                onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text">Energy (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                className="input-field"
                value={form.energy_level}
                onChange={(e) => setForm({ ...form, energy_level: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text">Stress (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                className="input-field"
                value={form.stress_level}
                onChange={(e) => setForm({ ...form, stress_level: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label-text">How are you feeling?</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => {
                const style = MOOD_STYLE[m];
                const active = form.mood === m;
                return (
                  <button
                    key={m}
                    onClick={() => setForm({ ...form, mood: m })}
                    className="badge border"
                    style={{
                      background: active ? style.bg : "rgba(255,255,255,0.04)",
                      color: active ? style.text : "#a3a3a3",
                      borderColor: active ? style.border : "transparent",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label-text">Notes</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="How's it going today?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <button onClick={saveLog} className="btn-primary w-full">
            {saved ? "Saved ✓" : editingExisting ? "Update this day" : "Save today's log"}
          </button>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">History</h3>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {logs.length === 0 && <p className="text-sm text-neutral-500">No logs yet.</p>}
            {logs.map((l) => {
              const style = l.mood ? MOOD_STYLE[l.mood] : null;
              return (
                <div
                  key={l.id}
                  className="rounded-lg p-3 text-sm border"
                  style={{
                    background: style ? style.bg : "rgba(255,255,255,0.02)",
                    borderColor: style ? style.border : "rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{l.log_date}</span>
                    <div className="flex items-center gap-2">
                      {l.mood && (
                        <span className="text-xs font-medium" style={{ color: style?.text }}>
                          {l.mood}
                        </span>
                      )}
                      <button onClick={() => loadIntoForm(l)} className="text-neutral-500 hover:text-gold-300">
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-neutral-400 mb-1">
                    <span>{l.weight_kg ? `${l.weight_kg}kg` : "—"}</span>
                    <span>Cal: {l.calories ?? "—"}</span>
                    <span>P: {l.protein ?? "—"}g</span>
                    <span>C: {l.carbs ?? "—"}g</span>
                  </div>
                  {l.training_notes && <p className="text-neutral-300">{l.training_notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
