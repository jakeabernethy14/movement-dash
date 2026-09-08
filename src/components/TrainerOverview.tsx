"use client";
import { useEffect, useState } from "react";
import { Users, Dumbbell, CalendarCheck, AlertTriangle } from "lucide-react";
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

  useEffect(() => {
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
    load();
  }, [userId]); // eslint-disable-line

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
            <h3 className="font-semibold mb-3">Today's sessions</h3>
            {todayEvents.length === 0 && (
              <p className="text-sm text-neutral-500">Nothing scheduled today.</p>
            )}
            <div className="space-y-2">
              {todayEvents.map((e) => (
                <div key={e.id} className="flex justify-between text-sm bg-base-850 rounded-lg p-2 border border-base-border">
                  <span>{e.title}</span>
                  <span className="text-gold-400">{e.start_time?.slice(0, 5) ?? ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <NotesPanel clientId={userId} ptId={userId} authorId={userId} />
        </div>
      </div>
    </div>
  );
}
