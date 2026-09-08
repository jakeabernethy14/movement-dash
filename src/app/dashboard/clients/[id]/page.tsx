"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import NotesPanel from "@/components/NotesPanel";
import { exportGoalsPDF, exportCheckupsPDF } from "@/lib/pdf";
import { Download, Plus } from "lucide-react";

type Tab = "program" | "nutrition" | "checkups" | "goals" | "notes" | "messages" | "details";

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
    { key: "nutrition", label: "Nutrition" },
    { key: "checkups", label: "Check-ups" },
    { key: "goals", label: "Goals" },
    { key: "notes", label: "Notes" },
    { key: "messages", label: "Messages" },
    { key: "details", label: "Details" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{client.full_name}</h1>
        <p className="text-neutral-400 text-sm">{client.email}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-base-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-gold-500 text-gold-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "program" && <ProgramTab clientId={id} ptId={session.userId} />}
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
  const [notes, setNotes] = useState("");

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

  async function assign() {
    if (!selectedPlan) return;
    await supabase.from("assigned_programs").insert({
      plan_id: selectedPlan,
      client_id: clientId,
      assigned_by: ptId,
      start_date: startDate,
      notes,
    });
    setNotes("");
    load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Assign a training plan</h3>
        <select className="input-field" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
          <option value="">Select a plan…</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Notes for this assignment…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button onClick={assign} className="btn-primary w-full">
          Assign plan
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
                <span className="text-neutral-500">{a.start_date}</span>
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

// ---------------- Details tab ----------------
function DetailsTab({ clientId, ptClient, onSaved, ptId }: { clientId: string; ptClient: any; onSaved: (v: any) => void; ptId: string }) {
  const supabase = createClient();
  const [description, setDescription] = useState(ptClient?.description ?? "");
  const [expiration, setExpiration] = useState(ptClient?.expiration ?? "");
  const [status, setStatus] = useState(ptClient?.status ?? "active");

  useEffect(() => {
    setDescription(ptClient?.description ?? "");
    setExpiration(ptClient?.expiration ?? "");
    setStatus(ptClient?.status ?? "active");
  }, [ptClient]);

  async function save() {
    const { data } = await supabase
      .from("pt_clients")
      .update({ description, expiration: expiration || null, status })
      .eq("client_id", clientId)
      .select()
      .single();
    onSaved(data);
  }

  return (
    <div className="card p-4 max-w-md space-y-3">
      <h3 className="font-semibold">Client details</h3>
      <div>
        <label className="label-text">Description</label>
        <textarea className="input-field resize-none" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label-text">Membership expiration</label>
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
      <button onClick={save} className="btn-primary">
        Save
      </button>
    </div>
  );
}
