"use client";
import { useEffect, useState } from "react";
import { Users, Dumbbell, CalendarCheck, AlertTriangle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StatCard from "./StatCard";
import MiniCalendar from "./MiniCalendar";
import NotesPanel from "./NotesPanel";
import NoticeBoard from "./NoticeBoard";
import Avatar from "./Avatar";
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    event_date: new Date().toISOString().slice(0, 10),
    start_time: "",
    end_time: "",
    event_type: "class",
    description: "",
  });

  async function loadStats() {
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
  }

  async function loadDay(date: Date) {
    const iso = format(date, "yyyy-MM-dd");
    const { data } = await supabase
      .from("schedule_events")
      .select("*, client:profiles!schedule_events_client_id_fkey(full_name, avatar_url)")
      .eq("pt_id", userId)
      .eq("event_date", iso)
      .order("start_time", { ascending: true });
    setSelectedDayEvents(data ?? []);
  }

  useEffect(() => {
    loadStats();
    loadDay(selectedDate);
  }, [userId]); // eslint-disable-line

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    loadDay(date);
  }

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
    loadStats();
    loadDay(selectedDate);
  }

  async function deleteEvent(id: string) {
    await supabase.from("schedule_events").delete().eq("id", id);
    loadDay(selectedDate);
    loadStats();
  }

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

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
          <MiniCalendar markedDates={markedDates} onSelectDate={handleSelectDate} />
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                {isToday ? "Today" : format(selectedDate, "d MMM")}'s sessions
              </h3>
              <button
                onClick={() => {
                  setEventForm({ ...eventForm, event_date: format(selectedDate, "yyyy-MM-dd") });
                  setShowEventForm(!showEventForm);
                }}
                className="text-gold-400 hover:text-gold-300"
                title="Add a calendar event"
              >
                <Plus size={18} />
              </button>
            </div>

            {showEventForm && (
              <div className="bg-base-850 border border-white/[0.06] rounded-lg p-3 mb-3 space-y-2">
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

            {selectedDayEvents.length === 0 && (
              <p className="text-sm text-neutral-500">Nothing scheduled this day.</p>
            )}
            <div className="space-y-2">
              {selectedDayEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-sm bg-base-850 rounded-lg p-2 border border-white/[0.05]">
                  <div className="flex items-center gap-2 min-w-0">
                    {e.client?.full_name && <Avatar url={e.client.avatar_url} name={e.client.full_name} size={20} />}
                    <span className="truncate">
                      {e.title}
                      {e.event_scope === "personal" && <span className="badge badge-gold ml-2">{e.event_type}</span>}
                      {e.client?.full_name && <span className="text-neutral-500"> — {e.client.full_name}</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gold-300">{e.start_time?.slice(0, 5) ?? ""}</span>
                    <button onClick={() => deleteEvent(e.id)} className="text-neutral-600 hover:text-red-400 text-xs">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="md:col-span-2 space-y-6">
          <NoticeBoard userId={userId} canPost />
          <NotesPanel clientId={userId} ptId={userId} authorId={userId} isSelfNote />
        </div>
      </div>
    </div>
  );
}
