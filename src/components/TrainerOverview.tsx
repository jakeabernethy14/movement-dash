"use client";
import { useEffect, useState } from "react";
import { Users, Dumbbell, CalendarCheck, AlertTriangle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StatCard from "./StatCard";
import MiniCalendar from "./MiniCalendar";
import NotesPanel from "./NotesPanel";
import { format } from "date-fns";

export default function TrainerOverview({ userId }: { userId: string }) {
  const supabase = createClient();
  const [stats, setStats] = useState({
    clients: 0,
    programs: 0,
    upcoming: 0,
    expiringSoon: 0,
  });
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    event_date: new Date().toISOString().slice(0, 10),
    start_time: "",
    end_time: "",
    event_type: "class",
    description: "",
  });

  async function load() {
    const { count: clientCount } = await supabase
      .from("pt_clients")
      .select("*", { count: "exact", head: true })
      .eq("pt_id", userId);

    const { count: programCount } = await supabase
      .from("training_plans")
      .select("*", { count: "exact", head: true })
      .eq("pt_id", userId);

    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);

    const { data: upcomingEvents } = await supabase
      .from("schedule_events")
      .select("*")
      .eq("pt_id", userId)
      .gte("event_date", format(new Date(), "yyyy-MM-dd"))
      .lte("event_date", format(in7, "yyyy-MM-dd"));

    const { count: expiring } = await supabase
      .from("pt_clients")
      .select("*", { count: "exact", head: true })
      .eq("pt_id", userId)
      .lte("expiration", format(in7, "yyyy-MM-dd"))
      .gte("expiration", format(new Date(), "yyyy-MM-dd"));

    setStats({
      clients: clientCount ?? 0,
      programs: programCount ?? 0,
      upcoming: upcomingEvents?.length ?? 0,
      expiringSoon: expiring ?? 0,
    });
    setMarkedDates((upcomingEvents ?? []).map((e) => e.event_date));

    const { data: today } = await supabase
      .from("schedule_events")
      .select("*, client:profiles!schedule_events_client_id_fkey(full_name)")
      .eq("pt_id", userId)
      .eq("event_date", format(new Date(), "yyyy-MM-dd"))
      .order("start_time", { ascending: true });
    setTodayEvents(today ?? []);
  }

  useEffect(() => {
    load();
  }, [userId]); // eslint-disable-line

  async function addPersonalEvent() {
    if (!eventForm.title.trim()) return;
    await supabase.from("schedule_events").insert({
      pt_id: userId,
      client_id: null,
      event_scope: "personal",
      title: eventForm.title,
      description: eventForm.description,
      event_date: eventForm.event_date,
      start_time: eventForm.start_time || null,
      end_time: eventForm.end_time || null,
      event_type: eventForm.event_type,
    });
    setEventForm({ ...eventForm, title: "", description: "" });
    setShowEventForm(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-neutral-400 text-sm">Here's what's happening with your clients.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total clients" value={stats.clients} icon={Users} />
        <StatCard label="Training plans" value={stats.programs} icon={Dumbbell} />
        <StatCard label="Sessions (7 days)" value={stats.upcoming} icon={CalendarCheck} />
        <StatCard
          label="Expiring soon"
          value={stats.expiringSoon}
          icon={AlertTriangle}
          sub="Within 7 days"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <MiniCalendar markedDates={markedDates} />
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Today's sessions</h3>
              <button
                onClick={() => setShowEventForm(!showEventForm)}
                className="text-gold-400 hover:text-gold-300"
                title="Add a calendar event"
              >
                <Plus size={18} />
              </button>
            </div>

            {showEventForm && (
              <div className="bg-base-850 border border-base-border rounded-lg p-3 mb-3 space-y-2">
                <input
                  className="input-field text-sm"
                  placeholder="Title (e.g. Group class, Coaching call)"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    className="input-field text-sm"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  />
                  <input
                    type="time"
                    className="input-field text-sm"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                  />
                  <select
                    className="input-field text-sm"
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                  >
                    <option value="class">Class</option>
                    <option value="call">Call</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button onClick={addPersonalEvent} className="btn-primary text-sm w-full py-1.5">
                  Add to my calendar
                </button>
              </div>
            )}

            {todayEvents.length === 0 && (
              <p className="text-sm text-neutral-500">Nothing scheduled today.</p>
            )}
            <div className="space-y-2">
              {todayEvents.map((e) => (
                <div key={e.id} className="flex justify-between text-sm bg-base-850 rounded-lg p-2 border border-base-border">
                  <span>
                    {e.title}
                    {e.event_scope === "personal" && (
                      <span className="badge badge-gold ml-2">{e.event_type}</span>
                    )}
                    {e.client?.full_name && (
                      <span className="text-neutral-500"> — {e.client.full_name}</span>
                    )}
                  </span>
                  <span className="text-gold-400">{e.start_time?.slice(0, 5) ?? ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <NotesPanel clientId={userId} ptId={userId} authorId={userId} isSelfNote />
        </div>
      </div>
    </div>
  );
}
