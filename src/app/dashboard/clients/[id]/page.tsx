"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import NotesPanel from "@/components/NotesPanel";
import Avatar from "@/components/Avatar";
import { exportGoalsPDF, exportCheckupsPDF } from "@/lib/pdf";
import { Download, Plus, Trash2 } from "lucide-react";

type Tab = "program" | "sessions" | "dailylog" | "nutrition" | "checkups" | "goals" | "notes" | "messages" | "details";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const session = useSession();
  const [tab, setTab] = useState<Tab>("program");
  const [client, setClient] = useState<any>(null);
  const [ptClient, setPtClient] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single();
      setClient(profile);
      const { data: rel } = await supabase
        .from("pt_clients")
        .select("*")
        .eq("client_id", id)
        .single();
      setPtClient(rel);
    }
    if (id) load();
  }, [id]); // eslint-disable-line

  if (!session.userId || !client) return <p className="text-neutral-500">Loading…</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "program", label: "Program" },
    { key: "sessions", label: "Sessions" },
    { key: "dailylog", label: "Daily Log" },
    { key: "nutrition", label: "Nutrition" },
    { key: "checkups", label: "Check-ups" },
    { key: "goals", label: "Goals" },
    { key: "notes", label: "Notes" },
    { key: "messages", label: "Messages" },
    { key: "details", label: "Details" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Avatar url={client.avatar_url} name={client.full_name} size={44} />
          <div>
            <h1 className="text-2xl font-bold">{client.full_name}</h1>
            <p className="text-neutral-400 text-sm">{client.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3", borderColor: "transparent" }}>
            Joined {new Date(client.created_at).toLocaleDateString()}
          </span>
          {ptClient?.status && (
            <span
              className="badge"
              style={
                ptClient.status === "active"
                  ? { background: "rgba(74,222,128,0.12)", color: "#4ade80", borderColor: "transparent" }
                  : { background: "rgba(248,113,113,0.12)", color: "#f87171", borderColor: "transparent" }
              }
            >
              {ptClient.status}
            </span>
          )}
          {client.access_expires_at && (
            <span className="badge badge-gold">
              Access until {new Date(client.access_expires_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-base-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-gold-400 text-gold-300"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "program" && <ProgramTab clientId={id} ptId={session.userId} />}
      {tab === "sessions" && <SessionsTab clientId={id} ptId={session.userId} />}
      {tab === "dailylog" && <DailyLogTab clientId={id} />}
      {tab === "nutrition" && <NutritionTab clientId={id} ptId={session.userId} />}
      {tab === "checkups" && (
        <CheckupsTab clientId={id} ptId={session.userId} clientName={client.full_name} />
      )}
      {tab === "goals" && <GoalsTab clientId={id} ptId={session.userId} clientName={client.full_name} />}
      {tab === "notes" && (
        <NotesPanel clientId={id} ptId={session.userId} authorId={session.userId} canChooseVisibility />
      )}
      {tab === "messages" && <MessagesTab clientId={id} ptId={session.userId} />}
      {tab === "details" && (
        <DetailsTab clientId={id} ptClient={ptClient} onSaved={setPtClient} ptId={session.userId} />
      )}
    </div>
  );
}

// ---------------- Program tab ----------------
function ProgramTab({ clientId, ptId }: { clientId: string; ptId: string }) {
  const supabase = createClient();
  const [plans, setPlans] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [dayDates, setDayDates] = useState<Record<number, string>>({});
  const [assigning, setAssigning] = useState(false);

  const plan = plans.find((p) => p.id === selectedPlan);

  async function load() {
    const { data: p } = await supabase.from("training_plans").select("*").eq("pt_id", ptId);
    setPlans(p ?? []);
    const { data: a } = await supabase
      .from("assigned_programs")
      .select("*, plan:training_plans(title)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setAssigned(a ?? []);
  }

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line

  // When a plan is picked, default each of its days to consecutive dates starting today.
  function handlePlanSelect(planId: string) {
    setSelectedPlan(planId);
    const p = plans.find((pl) => pl.id === planId);
    if (!p) return;
    const base = new Date(startDate);
    const defaults: Record<number, string> = {};
    (p.content ?? []).forEach((_: any, i: number) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      defaults[i] = d.toISOString().slice(0, 10);
    });
    setDayDates(defaults);
  }

  async function assign() {
    if (!selectedPlan || !plan) return;
    setAssigning(true);

    await supabase.from("assigned_programs").insert({
      plan_id: selectedPlan,
      client_id: clientId,
      assigned_by: ptId,
      start_date: startDate,
      end_date: endDate || null,
      notes,
    });

    // Also place each day of the plan onto the client's calendar on the chosen dates.
    const events = (plan.content ?? [])
      .map((day: any, i: number) => {
        const date = dayDates[i];
        if (!date) return null;
        const exerciseSummary = (day.exercises ?? [])
          .map((ex: any) => `${ex.name} — ${ex.sets}x${ex.reps}${ex.weight ? ` @ ${ex.weight}` : ""}`)
          .join("\n");
        return {
          client_id: clientId,
          pt_id: ptId,
          event_scope: "client",
          title: `${plan.title}: ${day.day}`,
          description: exerciseSummary,
          event_date: date,
          event_type: "training",
        };
      })
      .filter(Boolean);

    if (events.length > 0) {
      await supabase.from("schedule_events").insert(events);
    }

    setNotes("");
    setEndDate("");
    setSelectedPlan("");
    setDayDates({});
    setAssigning(false);
    load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Assign a training plan</h3>
        <select className="input-field" value={selectedPlan} onChange={(e) => handlePlanSelect(e.target.value)}>
          <option value="">Select a plan…</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Start date</label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (plan) handlePlanSelect(selectedPlan);
              }}
            />
          </div>
          <div>
            <label className="label-text">End date (optional)</label>
            <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {plan && plan.content?.length > 0 && (
          <div className="border border-white/[0.06] rounded-lg p-3 space-y-2 bg-base-850/60">
            <p className="text-xs text-neutral-400 mb-1">
              Pick which calendar date each day of this plan lands on:
            </p>
            {plan.content.map((day: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-sm">{day.day}</span>
                <input
                  type="date"
                  className="input-field w-auto text-sm py-1"
                  value={dayDates[i] ?? ""}
                  onChange={(e) => setDayDates({ ...dayDates, [i]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Notes for this assignment…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button onClick={assign} disabled={!selectedPlan || assigning} className="btn-primary w-full">
          {assigning ? "Assigning…" : "Assign plan & add to calendar"}
        </button>
        <p className="text-xs text-neutral-500">
          No plans yet? Create one under <span className="text-gold-400">Training Plans</span>.
        </p>
      </div>
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Assignment history</h3>
        <div className="space-y-2">
          {assigned.length === 0 && <p className="text-sm text-neutral-500">Nothing assigned yet.</p>}
          {assigned.map((a) => (
            <div key={a.id} className="bg-base-850 border border-base-border rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{a.plan?.title ?? "Removed plan"}</span>
                <span className="text-neutral-500">
                  {a.start_date}
                  {a.end_date ? ` → ${a.end_date}` : ""}
                </span>
              </div>
              {a.notes && <p className="text-neutral-400 mt-1">{a.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Nutrition tab ----------------
function NutritionTab({ clientId, ptId }: { clientId: string; ptId: string }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    calories_target: "",
    protein_target: "",
    carbs_target: "",
    fats_target: "",
    notes: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("nutrition_info").select("*").eq("client_id", clientId).maybeSingle();
      if (data) {
        setForm({
          calories_target: data.calories_target?.toString() ?? "",
          protein_target: data.protein_target?.toString() ?? "",
          carbs_target: data.carbs_target?.toString() ?? "",
          fats_target: data.fats_target?.toString() ?? "",
          notes: data.notes ?? "",
        });
      }
    }
    load();
  }, [clientId]); // eslint-disable-line

  async function save() {
    await supabase.from("nutrition_info").upsert(
      {
        client_id: clientId,
        pt_id: ptId,
        calories_target: Number(form.calories_target) || null,
        protein_target: Number(form.protein_target) || null,
        carbs_target: Number(form.carbs_target) || null,
        fats_target: Number(form.fats_target) || null,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="card p-4 max-w-lg space-y-3">
      <h3 className="font-semibold">Nutrition targets</h3>
      <div className="grid grid-cols-2 gap-3">
        {(["calories_target", "protein_target", "carbs_target", "fats_target"] as const).map((k) => (
          <div key={k}>
            <label className="label-text">{k.replace("_target", "").toUpperCase()}</label>
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
        <label className="label-text">Notes</label>
        <textarea
          className="input-field resize-none"
          rows={4}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <button onClick={save} className="btn-primary">
        {saved ? "Saved ✓" : "Save nutrition info"}
      </button>
    </div>
  );
}

// ---------------- Checkups tab ----------------
function CheckupsTab({ clientId, ptId, clientName }: { clientId: string; ptId: string; clientName: string }) {
  const supabase = createClient();
  const [checkups, setCheckups] = useState<any[]>([]);
  const [form, setForm] = useState({ weight_kg: "", body_fat_pct: "", notes: "" });

  async function load() {
    const { data } = await supabase
      .from("checkups")
      .select("*")
      .eq("client_id", clientId)
      .order("checkup_date", { ascending: false });
    setCheckups(data ?? []);
  }

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line

  async function addCheckup() {
    await supabase.from("checkups").insert({
      client_id: clientId,
      pt_id: ptId,
      weight_kg: Number(form.weight_kg) || null,
      body_fat_pct: Number(form.body_fat_pct) || null,
      notes: form.notes,
    });
    setForm({ weight_kg: "", body_fat_pct: "", notes: "" });
    load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Log a check-up</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="Weight (kg)"
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Body fat %"
            value={form.body_fat_pct}
            onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })}
          />
        </div>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Notes…"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button onClick={addCheckup} className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus size={16} /> Add check-up
        </button>
      </div>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">History</h3>
          <button
            onClick={() => exportCheckupsPDF(checkups, clientName)}
            className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            <Download size={12} /> Export PDF
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {checkups.length === 0 && <p className="text-sm text-neutral-500">No check-ups logged yet.</p>}
          {checkups.map((c) => (
            <div key={c.id} className="bg-base-850 border border-base-border rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{c.checkup_date}</span>
                <span className="text-neutral-400">
                  {c.weight_kg ? `${c.weight_kg}kg` : ""} {c.body_fat_pct ? `· ${c.body_fat_pct}%` : ""}
                </span>
              </div>
              {c.notes && <p className="text-neutral-400 mt-1">{c.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Goals tab ----------------
function GoalsTab({ clientId, ptId, clientName }: { clientId: string; ptId: string; clientName: string }) {
  const supabase = createClient();
  const [goals, setGoals] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", target_date: "" });

  async function load() {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setGoals(data ?? []);
  }

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line

  async function addGoal() {
    if (!form.title.trim()) return;
    await supabase.from("goals").insert({
      client_id: clientId,
      pt_id: ptId,
      title: form.title,
      target_date: form.target_date || null,
    });
    setForm({ title: "", target_date: "" });
    load();
  }

  async function updateProgress(id: string, progress: number) {
    await supabase
      .from("goals")
      .update({ progress, status: progress >= 100 ? "achieved" : "in_progress" })
      .eq("id", id);
    load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Add a goal</h3>
        <input
          className="input-field"
          placeholder="Goal title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          type="date"
          className="input-field"
          value={form.target_date}
          onChange={(e) => setForm({ ...form, target_date: e.target.value })}
        />
        <button onClick={addGoal} className="btn-primary w-full">
          Add goal
        </button>
      </div>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Goals</h3>
          <button
            onClick={() => exportGoalsPDF(goals, clientName)}
            className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            <Download size={12} /> Export PDF
          </button>
        </div>
        <div className="space-y-3">
          {goals.length === 0 && <p className="text-sm text-neutral-500">No goals yet.</p>}
          {goals.map((g) => (
            <div key={g.id} className="bg-base-850 border border-base-border rounded-lg p-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{g.title}</span>
                <span className="text-neutral-500">{g.target_date ?? "no date"}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={g.progress}
                onChange={(e) => updateProgress(g.id, Number(e.target.value))}
                className="w-full accent-gold-500"
              />
              <span className="text-xs text-neutral-500">{g.progress}% — {g.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Messages tab ----------------
function MessagesTab({ clientId, ptId }: { clientId: string; ptId: string }) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");

  async function load() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${ptId},recipient_id.eq.${clientId}),and(sender_id.eq.${clientId},recipient_id.eq.${ptId})`
      )
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line

  async function send() {
    if (!content.trim()) return;
    await supabase.from("messages").insert({ sender_id: ptId, recipient_id: clientId, content });
    setContent("");
    load();
  }

  return (
    <div className="card p-4 max-w-xl">
      <h3 className="font-semibold mb-3">Message thread</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto mb-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
              m.sender_id === ptId ? "ml-auto bg-gold-500/15 text-gold-100" : "bg-base-850 border border-base-border"
            }`}
          >
            {m.content}
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-neutral-500">No messages yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          className="input-field"
          placeholder="Type a message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} className="btn-primary">
          Send
        </button>
      </div>
    </div>
  );
}

// ---------------- Sessions tab (PT calendar entries for this client + responses) ----------------
function SessionsTab({ clientId, ptId }: { clientId: string; ptId: string }) {
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    event_date: new Date().toISOString().slice(0, 10),
    start_time: "",
    event_type: "training",
    description: "",
  });

  async function load() {
    const { data } = await supabase
      .from("schedule_events")
      .select("*")
      .eq("client_id", clientId)
      .order("event_date", { ascending: false });
    setEvents(data ?? []);
  }

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line

  async function addSession() {
    if (!form.title.trim()) return;
    await supabase.from("schedule_events").insert({
      client_id: clientId,
      pt_id: ptId,
      title: form.title,
      description: form.description,
      event_date: form.event_date,
      start_time: form.start_time || null,
      event_type: form.event_type,
      event_scope: "client",
    });
    setForm({ ...form, title: "", description: "" });
    load();
  }

  async function deleteSession(id: string) {
    await supabase.from("schedule_events").delete().eq("id", id);
    load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Schedule a session</h3>
        <input
          className="input-field"
          placeholder="Title (e.g. Upper body strength)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            className="input-field"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
          <input
            type="time"
            className="input-field"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
        </div>
        <select
          className="input-field"
          value={form.event_type}
          onChange={(e) => setForm({ ...form, event_type: e.target.value })}
        >
          <option value="training">Training</option>
          <option value="checkup">Check-up</option>
          <option value="rest">Rest day</option>
          <option value="note">Note</option>
        </select>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Description / what to do"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button onClick={addSession} className="btn-primary w-full">
          Add to schedule
        </button>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Sessions & client responses</h3>
        <p className="text-xs text-neutral-500 mb-3">
          Sessions the client has logged a result for are highlighted{" "}
          <span className="text-green-400 font-medium">green</span>.
        </p>
        <div className="space-y-2 max-h-[32rem] overflow-y-auto">
          {events.length === 0 && <p className="text-sm text-neutral-500">No sessions scheduled yet.</p>}
          {events.map((e) => (
            <div
              key={e.id}
              className={`rounded-lg p-3 text-sm border ${
                e.client_response
                  ? "bg-green-900/15 border-green-800/60"
                  : "bg-base-850 border-base-border"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{e.title}</span>
                  <span className="badge badge-gold ml-2">{e.event_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 text-xs">
                    {e.event_date} {e.start_time?.slice(0, 5) ?? ""}
                  </span>
                  <button onClick={() => deleteSession(e.id)} className="text-neutral-500 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {e.description && <p className="text-neutral-400 mt-1">{e.description}</p>}
              {e.client_response && (
                <div className="mt-2 pt-2 border-t border-green-800/40">
                  <p className="text-xs text-green-400 font-medium mb-0.5">Client's result / notes:</p>
                  <p className="text-neutral-200">{e.client_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Daily Log tab (read-only for PT: calories/macros/training notes) ----------------
function DailyLogTab({ clientId }: { clientId: string }) {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", clientId)
      .order("log_date", { ascending: false })
      .then(({ data }) => setLogs(data ?? []));
  }, [clientId]); // eslint-disable-line

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">Daily logs</h3>
      <div className="space-y-2 max-h-[32rem] overflow-y-auto">
        {logs.length === 0 && (
          <p className="text-sm text-neutral-500">Your client hasn't logged any days yet.</p>
        )}
        {logs.map((l) => (
          <div key={l.id} className="bg-base-850 border border-base-border rounded-lg p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="font-medium">{l.log_date}</span>
              {l.mood && <span className="badge badge-gold">{l.mood}</span>}
            </div>
            <div className="grid grid-cols-5 gap-2 text-xs text-neutral-400 mb-2">
              <span>{l.weight_kg ? `${l.weight_kg}kg` : "—"}</span>
              <span>Cal: {l.calories ?? "—"}</span>
              <span>Protein: {l.protein ?? "—"}g</span>
              <span>Carbs: {l.carbs ?? "—"}g</span>
              <span>Fats: {l.fats ?? "—"}g</span>
            </div>
            {l.training_notes && <p className="text-neutral-300">{l.training_notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}


function DetailsTab({ clientId, ptClient, onSaved, ptId }: { clientId: string; ptClient: any; onSaved: (v: any) => void; ptId: string }) {
  const supabase = createClient();
  const [description, setDescription] = useState(ptClient?.description ?? "");
  const [expiration, setExpiration] = useState(ptClient?.expiration ?? "");
  const [status, setStatus] = useState(ptClient?.status ?? "active");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [accessExpiresAt, setAccessExpiresAt] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [membershipMsg, setMembershipMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setDescription(ptClient?.description ?? "");
    setExpiration(ptClient?.expiration ?? "");
    setStatus(ptClient?.status ?? "active");
  }, [ptClient]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, username, access_expires_at")
      .eq("id", clientId)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setUsername(data.username ?? "");
          setAccessExpiresAt(data.access_expires_at ? data.access_expires_at.slice(0, 10) : "");
        }
      });
  }, [clientId]); // eslint-disable-line

  async function saveMembership() {
    setMembershipMsg(null);
    // upsert (not update) -- if a pt_clients row was ever missing for this client
    // (e.g. created outside the normal token flow), update() would silently match
    // zero rows. Upserting on client_id guarantees the row always exists after this.
    const { data, error } = await supabase
      .from("pt_clients")
      .upsert(
        { pt_id: ptId, client_id: clientId, description, expiration: expiration || null, status },
        { onConflict: "client_id" }
      )
      .select()
      .single();
    if (error) {
      setMembershipMsg({ type: "err", text: error.message });
      return;
    }
    onSaved(data);
    setMembershipMsg({ type: "ok", text: "Saved." });
  }

  async function saveAccount() {
    setSaving(true);
    setAccountMsg(null);
    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: clientId,
        fullName,
        username,
        accessExpiresAt: accessExpiresAt ? new Date(accessExpiresAt).toISOString() : null,
        ...(newPassword ? { newPassword } : {}),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setAccountMsg({ type: "err", text: json.error ?? "Something went wrong." });
      return;
    }
    setNewPassword("");
    setAccountMsg({ type: "ok", text: "Account updated." });
  }

  function extend(days: number) {
    const base = accessExpiresAt ? new Date(accessExpiresAt) : new Date();
    const from = base < new Date() ? new Date() : base;
    from.setDate(from.getDate() + days);
    setAccessExpiresAt(from.toISOString().slice(0, 10));
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Membership details</h3>
        {membershipMsg && (
          <p className={`text-sm ${membershipMsg.type === "ok" ? "text-gold-300" : "text-red-400"}`}>
            {membershipMsg.text}
          </p>
        )}
        <div>
          <label className="label-text">Description</label>
          <textarea className="input-field resize-none" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Membership expiration (display only)</label>
          <input type="date" className="input-field" value={expiration ?? ""} onChange={(e) => setExpiration(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Status</label>
          <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <button onClick={saveMembership} className="btn-primary">
          Save
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Account access</h3>
        <p className="text-xs text-neutral-500">
          This controls whether the client can actually log in. When their access expires, their
          account is frozen (not deleted) until you extend it here.
        </p>
        {accountMsg && (
          <p className={`text-sm ${accountMsg.type === "ok" ? "text-gold-400" : "text-red-400"}`}>
            {accountMsg.text}
          </p>
        )}
        <div>
          <label className="label-text">Full name</label>
          <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Username</label>
          <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Access expires on</label>
          <div className="flex gap-2">
            <input
              type="date"
              className="input-field"
              value={accessExpiresAt}
              onChange={(e) => setAccessExpiresAt(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => extend(7)} className="btn-secondary text-xs px-2 py-1">+7d</button>
            <button onClick={() => extend(30)} className="btn-secondary text-xs px-2 py-1">+1mo</button>
            <button onClick={() => extend(90)} className="btn-secondary text-xs px-2 py-1">+3mo</button>
            <button onClick={() => setAccessExpiresAt("")} className="btn-secondary text-xs px-2 py-1">Clear (never expires)</button>
          </div>
        </div>
        <div>
          <label className="label-text">Reset password (leave blank to skip)</label>
          <input
            type="password"
            className="input-field"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <button onClick={saveAccount} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save account changes"}
        </button>
      </div>
    </div>
  );
}
