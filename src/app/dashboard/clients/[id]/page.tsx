"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import NotesPanel from "@/components/NotesPanel";
import Avatar from "@/components/Avatar";
import { exportGoalsPDF, exportCheckupsPDF } from "@/lib/pdf";
import { Download, Plus, Trash2, Pencil } from "lucide-react";

type Tab = "program" | "sessions" | "dailylog" | "nutrition" | "checkups" | "goals" | "notes" | "details";

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
      {/* Messaging now lives in the global Messages tab in the sidebar */}
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
  const [source, setSource] = useState<"plan" | "custom">("plan");
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [mode, setMode] = useState<"single" | "repeat">("single");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [repeatStart, setRepeatStart] = useState(new Date().toISOString().slice(0, 10));
  const [repeatEnd, setRepeatEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [monthEvents, setMonthEvents] = useState<any[]>([]);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);

  const plan = plans.find((p) => p.id === selectedPlan);

  async function loadPlans() {
    const { data: p } = await supabase.from("training_plans").select("*").eq("pt_id", ptId);
    setPlans(p ?? []);
  }

  async function loadAssigned() {
    const { data: a } = await supabase
      .from("assigned_programs")
      .select("*, plan:training_plans(title)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setAssigned(a ?? []);
  }

  async function loadMonthEvents() {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("schedule_events")
      .select("*")
      .eq("client_id", clientId)
      .gte("event_date", start)
      .lte("event_date", end);
    setMonthEvents(data ?? []);
  }

  useEffect(() => {
    loadPlans();
    loadAssigned();
  }, [clientId]); // eslint-disable-line

  useEffect(() => {
    loadMonthEvents();
  }, [clientId, monthCursor]); // eslint-disable-line

  function dayName(y: number, m: number, d: number) {
    return new Date(y, m, d).toISOString().slice(0, 10);
  }

  const eventsByDate: Record<string, any[]> = {};
  monthEvents.forEach((e) => {
    eventsByDate[e.event_date] = eventsByDate[e.event_date] || [];
    eventsByDate[e.event_date].push(e);
  });

  async function assignSingleDay() {
    if (!selectedDate) return;
    if (source === "plan" && !plan) return;
    if (source === "custom" && !customTitle.trim()) return;
    setAssigning(true);

    let title: string;
    let description: string;
    let planId: string | null = null;

    if (source === "plan" && plan) {
      const day = plan.content?.[selectedDayIndex];
      description = (day?.exercises ?? [])
        .map((ex: any) => `${ex.name} — ${ex.sets}x${ex.reps}${ex.weight ? ` @ ${ex.weight}` : ""}`)
        .join("\n");
      title = `${plan.title}: ${day?.day ?? "Session"}`;
      planId = plan.id;
    } else {
      title = customTitle.trim();
      description = customDescription;
    }

    const { data: assignment } = await supabase
      .from("assigned_programs")
      .insert({
        plan_id: planId,
        client_id: clientId,
        assigned_by: ptId,
        start_date: selectedDate,
        end_date: selectedDate,
        notes: notes || title,
      })
      .select()
      .single();

    await supabase.from("schedule_events").insert({
      client_id: clientId,
      pt_id: ptId,
      event_scope: "client",
      title,
      description,
      event_date: selectedDate,
      event_type: "training",
      assigned_program_id: assignment?.id ?? null,
    });

    setNotes("");
    setCustomTitle("");
    setCustomDescription("");
    setSelectedDate("");
    setAssigning(false);
    loadAssigned();
    loadMonthEvents();
  }

  async function assignRepeatRange() {
    if (!plan || !repeatStart || !repeatEnd || !plan.content?.length) return;
    setAssigning(true);

    const { data: assignment } = await supabase
      .from("assigned_programs")
      .insert({
        plan_id: plan.id,
        client_id: clientId,
        assigned_by: ptId,
        start_date: repeatStart,
        end_date: repeatEnd,
        notes: notes || `${plan.title} (repeating)`,
      })
      .select()
      .single();

    const start = new Date(repeatStart);
    const end = new Date(repeatEnd);
    const events: any[] = [];
    let i = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1), i++) {
      const day = plan.content[i % plan.content.length];
      const exerciseSummary = (day.exercises ?? [])
        .map((ex: any) => `${ex.name} — ${ex.sets}x${ex.reps}${ex.weight ? ` @ ${ex.weight}` : ""}`)
        .join("\n");
      events.push({
        client_id: clientId,
        pt_id: ptId,
        event_scope: "client",
        title: `${plan.title}: ${day.day}`,
        description: exerciseSummary,
        event_date: d.toISOString().slice(0, 10),
        event_type: "training",
        assigned_program_id: assignment?.id ?? null,
      });
    }

    if (events.length > 0) {
      await supabase.from("schedule_events").insert(events);
    }

    setNotes("");
    setRepeatEnd("");
    setAssigning(false);
    loadAssigned();
    loadMonthEvents();
  }

  async function deleteAssignment(id: string) {
    if (!confirm("Delete this assignment? Any calendar sessions it created will be removed too.")) return;
    await supabase.from("assigned_programs").delete().eq("id", id);
    loadAssigned();
    loadMonthEvents();
  }

  async function saveAssignmentNotes() {
    if (!editingAssignment) return;
    await supabase
      .from("assigned_programs")
      .update({ notes: editingAssignment.notes })
      .eq("id", editingAssignment.id);
    setEditingAssignment(null);
    loadAssigned();
  }

  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // Monday-first

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* LEFT: plan + assignment controls */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold">Add to the client's calendar</h3>

          <div className="flex gap-2">
            <button
              onClick={() => setSource("plan")}
              className="badge cursor-pointer"
              style={source === "plan" ? { background: "rgba(212,175,55,0.14)", color: "#F2C94C", borderColor: "transparent" } : { background: "rgba(255,255,255,0.05)", color: "#a3a3a3", borderColor: "transparent" }}
            >
              From a saved plan
            </button>
            <button
              onClick={() => setSource("custom")}
              className="badge cursor-pointer"
              style={source === "custom" ? { background: "rgba(212,175,55,0.14)", color: "#F2C94C", borderColor: "transparent" } : { background: "rgba(255,255,255,0.05)", color: "#a3a3a3", borderColor: "transparent" }}
            >
              Create a day on the spot
            </button>
          </div>

          {source === "plan" && (
            <select className="input-field" value={selectedPlan} onChange={(e) => { setSelectedPlan(e.target.value); setSelectedDayIndex(0); }}>
              <option value="">Select a plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}

          {source === "custom" && (
            <div className="space-y-2 border border-white/[0.06] rounded-lg p-3 bg-base-850/60">
              <input
                className="input-field"
                placeholder="Session title (e.g. Upper body strength)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="Exercises / what to do"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
              />
              <p className="text-sm text-neutral-400">
                {selectedDate ? (
                  <>Selected date: <span className="text-gold-300">{selectedDate}</span></>
                ) : (
                  "Click a date on the calendar on the right →"
                )}
              </p>
              <button
                onClick={assignSingleDay}
                disabled={!selectedDate || !customTitle.trim() || assigning}
                className="btn-primary w-full"
              >
                {assigning ? "Assigning…" : "Add to the selected date"}
              </button>
            </div>
          )}

          {source === "plan" && plan && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("single")}
                  className="badge cursor-pointer"
                  style={mode === "single" ? { background: "rgba(212,175,55,0.14)", color: "#F2C94C", borderColor: "transparent" } : { background: "rgba(255,255,255,0.05)", color: "#a3a3a3", borderColor: "transparent" }}
                >
                  Pick a date on the calendar
                </button>
                <button
                  onClick={() => setMode("repeat")}
                  className="badge cursor-pointer"
                  style={mode === "repeat" ? { background: "rgba(212,175,55,0.14)", color: "#F2C94C", borderColor: "transparent" } : { background: "rgba(255,255,255,0.05)", color: "#a3a3a3", borderColor: "transparent" }}
                >
                  Repeat over a date range
                </button>
              </div>

              {mode === "single" && (
                <div className="space-y-2 border border-white/[0.06] rounded-lg p-3 bg-base-850/60">
                  <label className="label-text">Which day of the plan?</label>
                  <select className="input-field" value={selectedDayIndex} onChange={(e) => setSelectedDayIndex(Number(e.target.value))}>
                    {(plan.content ?? []).map((day: any, i: number) => (
                      <option key={i} value={i}>{day.day}</option>
                    ))}
                  </select>
                  <p className="text-sm text-neutral-400">
                    {selectedDate ? (
                      <>Selected date: <span className="text-gold-300">{selectedDate}</span></>
                    ) : (
                      "Click a date on the calendar on the right →"
                    )}
                  </p>
                  <button
                    onClick={assignSingleDay}
                    disabled={!selectedDate || assigning}
                    className="btn-primary w-full"
                  >
                    {assigning ? "Assigning…" : "Assign this day to the selected date"}
                  </button>
                </div>
              )}

              {mode === "repeat" && (
                <div className="space-y-2 border border-white/[0.06] rounded-lg p-3 bg-base-850/60">
                  <p className="text-xs text-neutral-400">
                    The plan's {plan.content?.length ?? 0} day(s) will cycle repeatedly across every day in this range
                    (e.g. a 3-day plan over 30 days repeats ~10 times).
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label-text">From</label>
                      <input type="date" className="input-field" value={repeatStart} onChange={(e) => setRepeatStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="label-text">To</label>
                      <input type="date" className="input-field" value={repeatEnd} onChange={(e) => setRepeatEnd(e.target.value)} />
                    </div>
                  </div>
                  <button
                    onClick={assignRepeatRange}
                    disabled={!repeatEnd || assigning}
                    className="btn-primary w-full"
                  >
                    {assigning ? "Assigning…" : "Assign & repeat across range"}
                  </button>
                </div>
              )}

              <div>
                <label className="label-text">Notes (optional)</label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Notes for this assignment…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
          {!plan && (
            <p className="text-xs text-neutral-500">
              No plans yet? Create one under <span className="text-gold-400">Training Plans</span>.
            </p>
          )}
        </div>

        {/* RIGHT: client's calendar */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setMonthCursor(new Date(y, m - 1, 1))}
              className="p-1.5 rounded hover:bg-white/5 text-neutral-400"
            >
              ‹
            </button>
            <span className="font-medium text-sm">{monthLabel}</span>
            <button
              onClick={() => setMonthCursor(new Date(y, m + 1, 1))}
              className="p-1.5 rounded hover:bg-white/5 text-neutral-400"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-500 mb-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => <span key={"b" + i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dateStr = dayName(y, m, i + 1);
              const hasEvents = eventsByDate[dateStr]?.length > 0;
              const canPick = source === "custom" || (source === "plan" && mode === "single" && !!plan);
              const isSelected = canPick && selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => canPick && setSelectedDate(dateStr)}
                  disabled={!canPick}
                  className="relative text-xs h-10 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: isSelected ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.02)",
                    border: isSelected ? "1px solid rgba(212,175,55,0.5)" : "1px solid transparent",
                    color: canPick ? "#d4d4d4" : "#525252",
                    cursor: canPick ? "pointer" : "default",
                  }}
                >
                  {i + 1}
                  {hasEvents && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-gold-400" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Gold dots = days that already have something scheduled.
            {source === "custom" ? " Click an empty date to place this custom session there." : mode === "single" ? " Click an empty date to place the selected plan day there." : ""}
          </p>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Assignment history</h3>
        <div className="space-y-2">
          {assigned.length === 0 && <p className="text-sm text-neutral-500">Nothing assigned yet.</p>}
          {assigned.map((a) => (
            <div key={a.id} className="bg-base-850 border border-base-border rounded-lg p-3 text-sm">
              {editingAssignment?.id === a.id ? (
                <div className="space-y-2">
                  <textarea
                    className="input-field resize-none"
                    rows={2}
                    value={editingAssignment.notes ?? ""}
                    onChange={(e) => setEditingAssignment({ ...editingAssignment, notes: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button onClick={saveAssignmentNotes} className="btn-primary text-xs px-3 py-1">Save</button>
                    <button onClick={() => setEditingAssignment(null)} className="btn-secondary text-xs px-3 py-1">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium">{a.plan?.title ?? "Removed plan"}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-neutral-500 text-xs">
                        {a.start_date}{a.end_date && a.end_date !== a.start_date ? ` → ${a.end_date}` : ""}
                      </span>
                      <button onClick={() => setEditingAssignment(a)} className="text-neutral-500 hover:text-gold-300">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteAssignment(a.id)} className="text-neutral-500 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {a.notes && <p className="text-neutral-400 mt-1">{a.notes}</p>}
                </>
              )}
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
  const [saved, setSaved] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savedPlan, setSavedPlan] = useState<any>(null);

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
      setSavedPlan(data);
    }
  }

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line

  async function save() {
    setSaved(null);
    const { data, error } = await supabase
      .from("nutrition_info")
      .upsert(
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
      )
      .select()
      .single();
    if (error) {
      setSaved({ type: "err", text: error.message });
      return;
    }
    setSavedPlan(data);
    setSaved({ type: "ok", text: "Saved — this now shows on the client's Nutrition Plan tab." });
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Nutrition targets</h3>
        {saved && (
          <p className={`text-sm ${saved.type === "ok" ? "text-gold-300" : "text-red-400"}`}>{saved.text}</p>
        )}
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
          Save nutrition info
        </button>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">What the client currently sees</h3>
        {!savedPlan ? (
          <p className="text-sm text-neutral-500">Nothing saved yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-base-850 border border-white/[0.06] rounded-lg p-3">
                <p className="text-xs text-neutral-500">Calories</p>
                <p className="text-lg font-semibold">{savedPlan.calories_target ?? "—"}</p>
              </div>
              <div className="bg-base-850 border border-white/[0.06] rounded-lg p-3">
                <p className="text-xs text-neutral-500">Protein</p>
                <p className="text-lg font-semibold">{savedPlan.protein_target ?? "—"}g</p>
              </div>
              <div className="bg-base-850 border border-white/[0.06] rounded-lg p-3">
                <p className="text-xs text-neutral-500">Carbs</p>
                <p className="text-lg font-semibold">{savedPlan.carbs_target ?? "—"}g</p>
              </div>
              <div className="bg-base-850 border border-white/[0.06] rounded-lg p-3">
                <p className="text-xs text-neutral-500">Fats</p>
                <p className="text-lg font-semibold">{savedPlan.fats_target ?? "—"}g</p>
              </div>
            </div>
            {savedPlan.notes && (
              <div>
                <p className="text-xs text-neutral-500 mb-1">Notes</p>
                <p className="text-sm text-neutral-300 whitespace-pre-wrap">{savedPlan.notes}</p>
              </div>
            )}
            <p className="text-xs text-neutral-600">
              Last updated {new Date(savedPlan.updated_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Checkups tab ----------------
function CheckupsTab({ clientId, ptId, clientName }: { clientId: string; ptId: string; clientName: string }) {
  const supabase = createClient();
  const [checkups, setCheckups] = useState<any[]>([]);
  const [form, setForm] = useState({ weight_kg: "", body_fat_pct: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (editingId) {
      await supabase
        .from("checkups")
        .update({
          weight_kg: Number(form.weight_kg) || null,
          body_fat_pct: Number(form.body_fat_pct) || null,
          notes: form.notes,
        })
        .eq("id", editingId);
      setEditingId(null);
    } else {
      await supabase.from("checkups").insert({
        client_id: clientId,
        pt_id: ptId,
        weight_kg: Number(form.weight_kg) || null,
        body_fat_pct: Number(form.body_fat_pct) || null,
        notes: form.notes,
      });
    }
    setForm({ weight_kg: "", body_fat_pct: "", notes: "" });
    load();
  }

  function startEdit(c: any) {
    setEditingId(c.id);
    setForm({
      weight_kg: c.weight_kg?.toString() ?? "",
      body_fat_pct: c.body_fat_pct?.toString() ?? "",
      notes: c.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ weight_kg: "", body_fat_pct: "", notes: "" });
  }

  async function deleteCheckup(id: string) {
    if (!confirm("Delete this check-up entry?")) return;
    await supabase.from("checkups").delete().eq("id", id);
    if (editingId === id) cancelEdit();
    load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">{editingId ? "Edit check-up" : "Log a check-up"}</h3>
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
        <div className="flex gap-2">
          <button onClick={addCheckup} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Plus size={16} /> {editingId ? "Save changes" : "Add check-up"}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
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
              <div className="flex justify-between items-start">
                <span className="font-medium">{c.checkup_date}</span>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">
                    {c.weight_kg ? `${c.weight_kg}kg` : ""} {c.body_fat_pct ? `· ${c.body_fat_pct}%` : ""}
                  </span>
                  <button onClick={() => startEdit(c)} className="text-neutral-500 hover:text-gold-300">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteCheckup(c.id)} className="text-neutral-500 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
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

// ---------------- Sessions tab (PT calendar entries for this client + responses) ----------------
function SessionsTab({ clientId, ptId }: { clientId: string; ptId: string }) {
  const supabase = createClient();
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);

  async function load() {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("schedule_events")
      .select("*")
      .eq("client_id", clientId)
      .gte("event_date", start)
      .lte("event_date", end);
    setEvents(data ?? []);
  }

  useEffect(() => {
    load();
  }, [clientId, monthCursor]); // eslint-disable-line

  async function deleteEvent(id: string) {
    if (!confirm("Delete this session from the client's calendar?")) return;
    await supabase.from("schedule_events").delete().eq("id", id);
    setViewing(null);
    load();
  }

  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // Monday-first

  const eventsByDate: Record<string, any[]> = {};
  events.forEach((e) => {
    eventsByDate[e.event_date] = eventsByDate[e.event_date] || [];
    eventsByDate[e.event_date].push(e);
  });

  function dateStr(day: number) {
    return new Date(y, m, day).toISOString().slice(0, 10);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        The client's sessions and responses. Days are highlighted{" "}
        <span className="text-green-400 font-medium">green</span> once they've logged a result.
        Sessions themselves are created from the <span className="text-gold-400">Program</span> tab
        or, for calls, from <span className="text-gold-400">Sessions & Classes</span>.
      </p>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonthCursor(new Date(y, m - 1, 1))} className="p-1.5 rounded hover:bg-white/5 text-neutral-400">‹</button>
          <span className="font-semibold">{monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button onClick={() => setMonthCursor(new Date(y, m + 1, 1))} className="p-1.5 rounded hover:bg-white/5 text-neutral-400">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-500 mb-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => <span key={"b" + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const iso = dateStr(i + 1);
            const dayEvents = eventsByDate[iso] ?? [];
            const hasResponse = dayEvents.some((e) => e.client_response);
            const hasEvents = dayEvents.length > 0;
            return (
              <div
                key={iso}
                onMouseEnter={() => setHoveredDate(iso)}
                onMouseLeave={() => setHoveredDate((d) => (d === iso ? null : d))}
                className="relative h-16 rounded-lg flex flex-col items-center justify-center text-xs border"
                style={{
                  background: hasResponse ? "rgba(74,222,128,0.14)" : hasEvents ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
                  borderColor: hasResponse ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.06)",
                }}
              >
                <span className={hasResponse ? "text-green-300 font-medium" : "text-neutral-300"}>{i + 1}</span>
                {hasEvents && (
                  <span className="text-[9px] text-neutral-500 mt-0.5">{dayEvents.length} session{dayEvents.length > 1 ? "s" : ""}</span>
                )}
                {hasEvents && hoveredDate === iso && (
                  <button
                    onClick={() => setViewing(dayEvents[0])}
                    className="absolute inset-x-1 bottom-1 text-[10px] py-0.5 rounded bg-gold-400 text-base-950 font-semibold"
                  >
                    View
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {viewing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-5 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{viewing.title}</h3>
                <p className="text-xs text-neutral-500">{viewing.event_date} {viewing.start_time?.slice(0, 5) ?? ""}</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-neutral-400 hover:text-neutral-200">✕</button>
            </div>
            <span className="badge badge-gold">{viewing.event_type}</span>
            {viewing.description && (
              <div>
                <p className="text-xs text-neutral-500 mb-1">Plan</p>
                <p className="text-sm text-neutral-200 whitespace-pre-wrap">{viewing.description}</p>
              </div>
            )}
            {viewing.client_response ? (
              <div className="pt-2 border-t border-green-800/40">
                <p className="text-xs text-green-400 font-medium mb-1">Client's result / notes</p>
                <p className="text-sm text-neutral-200">{viewing.client_response}</p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No response logged yet.</p>
            )}
            <button onClick={() => deleteEvent(viewing.id)} className="btn-danger text-sm w-full">
              Delete this session
            </button>
          </div>
        </div>
      )}
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
  const [status, setStatus] = useState(ptClient?.status ?? "active");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [accessExpiresAt, setAccessExpiresAt] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [membershipMsg, setMembershipMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setDescription(ptClient?.description ?? "");
    setStatus(ptClient?.status ?? "active");
  }, [ptClient]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, username, phone, access_expires_at")
      .eq("id", clientId)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setUsername(data.username ?? "");
          setPhone(data.phone ?? "");
          setAccessExpiresAt(data.access_expires_at ? data.access_expires_at.slice(0, 10) : "");
        }
      });
  }, [clientId]); // eslint-disable-line

  const isExpired = accessExpiresAt ? new Date(accessExpiresAt) < new Date() : false;
  const effectiveStatus = isExpired ? "expired" : status;

  async function saveMembership() {
    setMembershipMsg(null);
    // upsert (not update) -- if a pt_clients row was ever missing for this client
    // (e.g. created outside the normal token flow), update() would silently match
    // zero rows. Upserting on client_id guarantees the row always exists after this.
    const { data, error } = await supabase
      .from("pt_clients")
      .upsert(
        { pt_id: ptId, client_id: clientId, description, status },
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
        phone,
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
          <label className="label-text">Status</label>
          <select
            className="input-field"
            value={effectiveStatus === "expired" ? "expired" : status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isExpired}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
          {isExpired && (
            <p className="text-xs text-red-400 mt-1">
              Status is automatically "Expired" because their access date has passed — extend it in
              the Account access box to change this.
            </p>
          )}
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
          <label className="label-text">Phone number</label>
          <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
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
