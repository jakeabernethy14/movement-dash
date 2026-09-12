"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import Avatar from "@/components/Avatar";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function SessionsPage() {
  const supabase = createClient();
  const session = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    scope: "personal" as "personal" | "client",
    clientId: "",
    title: "",
    event_date: new Date().toISOString().slice(0, 10),
    start_time: "",
    end_time: "",
    event_type: "class",
    description: "",
  });

  async function load() {
    if (!session.userId) return;
    const { data } = await supabase
      .from("schedule_events")
      .select("*, client:profiles!schedule_events_client_id_fkey(full_name, avatar_url)")
      .eq("pt_id", session.userId)
      .gte("event_date", format(new Date(), "yyyy-MM-dd"))
      // This page is for personal schedule + calls only -- a client's day-by-day
      // workout plan (event_type 'training') is managed from their Program tab and
      // reviewed on their Sessions calendar, not listed here.
      .or("event_scope.eq.personal,event_type.eq.call")
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(100);
    setEvents(data ?? []);

    const { data: c } = await supabase
      .from("pt_clients")
      .select("client:profiles!pt_clients_client_id_fkey(id, full_name)")
      .eq("pt_id", session.userId);
    setClients((c ?? []).map((r: any) => r.client).filter(Boolean));
  }

  useEffect(() => {
    load();
  }, [session.userId]); // eslint-disable-line

  async function addEvent() {
    if (!form.title.trim()) return;
    if (form.scope === "client" && !form.clientId) return;
    await supabase.from("schedule_events").insert({
      pt_id: session.userId,
      client_id: form.scope === "client" ? form.clientId : null,
      event_scope: form.scope,
      title: form.title,
      description: form.description,
      event_date: form.event_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      event_type: form.scope === "client" ? "call" : form.event_type,
    });
    setForm({ ...form, title: "", description: "" });
    setShowForm(false);
    load();
  }

  async function deleteEvent(id: string) {
    await supabase.from("schedule_events").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sessions & Classes</h1>
          <p className="text-neutral-400 text-sm">Your personal schedule, classes, and client calls (day-by-day training plans live on each client's Program tab).</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Log a session / class
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-3 max-w-lg">
          <div className="flex gap-2">
            <button
              onClick={() => setForm({ ...form, scope: "personal" })}
              className={`badge cursor-pointer ${form.scope === "personal" ? "badge-gold" : ""}`}
              style={form.scope !== "personal" ? { background: "rgba(255,255,255,0.05)", color: "#a3a3a3", borderColor: "transparent" } : undefined}
            >
              Personal (class / call)
            </button>
            <button
              onClick={() => setForm({ ...form, scope: "client" })}
              className={`badge cursor-pointer ${form.scope === "client" ? "badge-gold" : ""}`}
              style={form.scope !== "client" ? { background: "rgba(255,255,255,0.05)", color: "#a3a3a3", borderColor: "transparent" } : undefined}
            >
              Call with a client
            </button>
          </div>

          {form.scope === "client" && (
            <select
              className="input-field"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          )}

          <input
            className="input-field"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
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
            {form.scope === "personal" && (
              <select
                className="input-field"
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                <option value="class">Class</option>
                <option value="call">Call</option>
                <option value="other">Other</option>
              </select>
            )}
          </div>
          <textarea
            className="input-field resize-none"
            rows={2}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button onClick={addEvent} className="btn-primary w-full">
            Add
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-850/60 text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">With</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-neutral-500">
                  Nothing upcoming. Log a session or class above.
                </td>
              </tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-neutral-400">
                  {e.event_date} {e.start_time?.slice(0, 5) ?? ""}
                </td>
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3">
                  {e.client ? (
                    <div className="flex items-center gap-2">
                      <Avatar url={e.client.avatar_url} name={e.client.full_name} size={20} />
                      <span className="text-neutral-300">{e.client.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-neutral-500">Personal</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-gold">{e.event_type}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteEvent(e.id)} className="text-neutral-500 hover:text-red-400">
                    <Trash2 size={15} />
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
