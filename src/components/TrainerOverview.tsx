"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { addDays } from "date-fns";
import { AlertCircle, CalendarPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { buildActivity, dateKey, type CoachDashboardData, type DashboardClient, type DashboardEvent } from "@/lib/dashboard";
import CoachDashboardView from "./CoachDashboardView";
import NotesPanel from "./NotesPanel";
import NoticeBoard from "./NoticeBoard";
import Modal from "./ui/Modal";
import { toast } from "./ui/Toast";

const empty: CoachDashboardData = { clients: [], planCount: 0, upcomingCount: 0, activity: [], selectedDate: dateKey(), dayEvents: [] };
export default function TrainerOverview({ userId, isOwner }: { userId: string; isOwner?: boolean }) {
  const supabase = createClient();
  const session = useSession();
  const [data, setData] = useState<CoachDashboardData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", event_date: dateKey(), start_time: "", end_time: "", event_type: "class" });
  const selected = useRef(dateKey());
  const request = useRef(0);

  const loadDay = useCallback(async (date: string) => {
    const version = ++request.current;
    selected.current = date;
    setData(d => ({ ...d, selectedDate: date, dayEvents: [] }));
    const { data: events, error: dayError } = await supabase.from("schedule_events").select("*, client:profiles!schedule_events_client_id_fkey(full_name, avatar_url)").eq("pt_id", userId).eq("event_date", date).order("start_time", { ascending: true });
    if (version !== request.current) return;
    if (dayError) { setError("We couldn't load that day's sessions. Please try again."); return; }
    setData(d => ({ ...d, dayEvents: (events ?? []) as DashboardEvent[] }));
  }, [supabase, userId]);

  const load = useCallback(async () => {
    setError("");
    try {
      const today = dateKey();
      const [roster, plans, events, messages] = await Promise.all([
        supabase.from("pt_clients").select("description, status, client:profiles!pt_clients_client_id_fkey(id, full_name, email, avatar_url, access_expires_at, disabled)").eq("pt_id", userId),
        supabase.from("training_plans").select("id", { count: "exact", head: true }).eq("pt_id", userId),
        supabase.from("schedule_events").select("*").eq("pt_id", userId).gte("event_date", dateKey(addDays(new Date(), -6))).lte("event_date", dateKey(addDays(new Date(), 6))),
        supabase.from("messages").select("sender_id").eq("recipient_id", userId).eq("read", false),
      ]);
      for (const result of [roster, plans, events, messages]) if (result.error) throw result.error;
      const unread = new Set((messages.data ?? []).map(m => m.sender_id));
      const clients: DashboardClient[] = (roster.data ?? []).flatMap((row: any) => row.client ? [{ id: row.client.id, name: row.client.full_name, email: row.client.email, avatarUrl: row.client.avatar_url, description: row.description, status: row.status, expiresAt: row.client.access_expires_at, disabled: row.client.disabled, unread: unread.has(row.client.id) }] : []);
      const allEvents = (events.data ?? []) as DashboardEvent[];
      setData(d => ({ ...d, clients, planCount: plans.count ?? 0, upcomingCount: allEvents.filter(e => e.event_date >= today && e.event_type !== "rest" && e.event_type !== "note").length, activity: buildActivity(allEvents) }));
      await loadDay(selected.current);
    } catch { setError("Your dashboard couldn't be refreshed. Check your connection and try again."); }
    finally { setLoading(false); }
  }, [supabase, userId, loadDay]);
  useEffect(() => { load(); return () => { request.current++; }; }, [load]);

  async function addPersonalEvent(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !form.title.trim()) return;
    if (form.end_time && (!form.start_time || form.end_time <= form.start_time)) { setFormError("Choose an end time after the start time."); return; }
    setSaving(true); setFormError("");
    try {
      const { error } = await supabase.from("schedule_events").insert({ pt_id: userId, client_id: null, event_scope: "personal", title: form.title.trim(), description: form.description.trim(), event_date: form.event_date, start_time: form.start_time || null, end_time: form.end_time || null, event_type: form.event_type });
      if (error) throw error;
      setShowEventForm(false); setForm(f => ({ ...f, title: "", description: "" })); toast("Session added to your calendar."); await load();
    } catch { setFormError("That event couldn't be saved. Your details are still here - please try again."); }
    finally { setSaving(false); }
  }
  async function deleteEvent() {
    if (!deleteId || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("schedule_events").delete().eq("id", deleteId).eq("pt_id", userId);
      if (error) throw error;
      setDeleteId(null); toast("Session removed from your calendar."); await load();
    } catch { toast("We couldn't delete this session. Please try again.", "error"); }
    finally { setSaving(false); }
  }
  if (loading) return <div aria-busy="true" aria-label="Loading your dashboard"><div className="skeleton h-12 w-72 mb-6"/><div className="skeleton h-52 mb-5"/><div className="stats-grid">{[0, 1, 2, 3].map(i => <div className="skeleton h-32" key={i}/>)}</div><div className="skeleton h-72"/></div>;
  return <>
    {error && <div role="alert" className="error-banner"><AlertCircle size={17}/>{error}<button onClick={load}>Try again</button></div>}
    <CoachDashboardView name={session.profile?.full_name || "Coach"} data={data} onDateChange={date => { setError(""); loadDay(date); }} onAddEvent={() => { setForm(f => ({ ...f, event_date: data.selectedDate })); setFormError(""); setShowEventForm(true); }} onDeleteEvent={setDeleteId}/>
    <div className="dashboard-secondary"><NoticeBoard userId={userId} canPost isOwner={isOwner}/><NotesPanel clientId={userId} ptId={userId} authorId={userId} isSelfNote/></div>
    {showEventForm && <Modal title="Add a calendar event" onClose={() => !saving && setShowEventForm(false)}><form onSubmit={addPersonalEvent} className="space-y-4">{formError && <div role="alert" className="error-banner">{formError}</div>}<div><label htmlFor="event-title" className="label-text">Session name</label><input data-autofocus id="event-title" required maxLength={140} className="input-field" placeholder="e.g. Small-group strength or coaching call" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></div><div className="grid grid-cols-2 gap-3"><div><label htmlFor="event-date" className="label-text">Date</label><input id="event-date" required type="date" className="input-field" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })}/></div><div><label htmlFor="event-type" className="label-text">Type</label><select id="event-type" className="input-field" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}><option value="class">Class</option><option value="call">Coaching call</option><option value="other">Other</option></select></div><div><label htmlFor="event-start" className="label-text">Start time (optional)</label><input id="event-start" type="time" className="input-field" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}/></div><div><label htmlFor="event-end" className="label-text">End time (optional)</label><input id="event-end" type="time" className="input-field" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}/></div></div><div><label htmlFor="event-notes" className="label-text">Notes (optional)</label><textarea id="event-notes" rows={3} className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></div><p className="muted">This adds a personal calendar event. Assign individual client training from their profile.</p><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={saving} onClick={() => setShowEventForm(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={16}/> : <CalendarPlus size={16}/>}Save event</button></div></form></Modal>}
    {deleteId && <Modal title="Remove this session?" onClose={() => !saving && setDeleteId(null)}><p className="muted">This will permanently remove the selected event and any response attached to it. It cannot be undone.</p><div className="flex justify-end gap-2 mt-6"><button className="btn-secondary" onClick={() => setDeleteId(null)} disabled={saving}>Keep session</button><button className="btn-danger" onClick={deleteEvent} disabled={saving}>{saving ? "Removing..." : "Remove session"}</button></div></Modal>}
  </>;
}
