"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Target, MessageCircle, CalendarDays, Dumbbell } from "lucide-react";
import Link from "next/link";
import NoticeBoard from "./NoticeBoard";

export default function ClientOverview({ userId }: { userId: string }) {
  const supabase = createClient();
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [weekEvents, setWeekEvents] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [ptNotes, setPtNotes] = useState<any[]>([]);
  const [ptName, setPtName] = useState<string>("");
  const [activePlan, setActivePlan] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      const today = format(new Date(), "yyyy-MM-dd");

      const { data: pt } = await supabase
        .from("pt_clients")
        .select("pt_id, pt:profiles!pt_clients_pt_id_fkey(full_name)")
        .eq("client_id", userId)
        .single();
      // @ts-ignore
      setPtName(pt?.pt?.full_name ?? "");

      const { data: today_ } = await supabase
        .from("schedule_events")
        .select("*")
        .eq("client_id", userId)
        .eq("event_date", today)
        .order("start_time", { ascending: true });
      setTodayEvents(today_ ?? []);

      const { data: events } = await supabase
        .from("schedule_events")
        .select("*")
        .eq("client_id", userId)
        .gt("event_date", today)
        .lte("event_date", format(in7, "yyyy-MM-dd"))
        .order("event_date", { ascending: true });
      setWeekEvents(events ?? []);

      const { data: g } = await supabase
        .from("goals")
        .select("*")
        .eq("client_id", userId)
        .eq("status", "in_progress")
        .order("target_date", { ascending: true })
        .limit(3);
      setGoals(g ?? []);

      const { data: notes } = await supabase
        .from("notes")
        .select("*, author:profiles!notes_author_id_fkey(full_name, username)")
        .eq("client_id", userId)
        .eq("visibility", "shared")
        .order("created_at", { ascending: false })
        .limit(3);
      setPtNotes(notes ?? []);

      const { data: plan } = await supabase
        .from("assigned_programs")
        .select("*, plan:training_plans(title)")
        .eq("client_id", userId)
        .lte("start_date", today)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActivePlan(plan);
    }
    load();
  }, [userId]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        {ptName && <p className="text-neutral-400 text-sm">Trainer: {ptName}</p>}
      </div>

      {activePlan?.plan && (
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)" }}>
              <Dumbbell size={16} className="text-gold-300" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">Current plan</p>
              <p className="font-medium">{activePlan.plan.title}</p>
            </div>
          </div>
          <Link href="/dashboard/calendar" className="text-sm text-gold-300 hover:underline">
            View calendar →
          </Link>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} className="text-gold-300" />
          <h3 className="font-semibold">Today — {format(new Date(), "EEEE d MMMM")}</h3>
        </div>
        {todayEvents.length === 0 && <p className="text-sm text-neutral-500">Nothing scheduled today. Rest day!</p>}
        <div className="grid sm:grid-cols-2 gap-2">
          {todayEvents.map((e) => (
            <div key={e.id} className="bg-base-850 border border-white/[0.05] rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{e.title}</span>
                <span className="text-gold-300">{e.start_time?.slice(0, 5) ?? ""}</span>
              </div>
              {e.description && <p className="text-neutral-400 mt-1">{e.description}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-4 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-gold-300" />
            <h3 className="font-semibold">Coming up</h3>
          </div>
          {weekEvents.length === 0 && (
            <p className="text-sm text-neutral-500">Nothing else scheduled this week.</p>
          )}
          <div className="space-y-2">
            {weekEvents.map((e) => (
              <div key={e.id} className="bg-base-850 border border-white/[0.05] rounded-lg p-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-gold-300">{e.start_time?.slice(0, 5) ?? ""}</span>
                </div>
                <span className="text-xs text-neutral-500">
                  {format(new Date(e.event_date), "EEE d MMM")}
                </span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/calendar" className="text-sm text-gold-300 hover:underline block mt-3">
            View full calendar →
          </Link>
        </div>

        <div className="card p-4 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-gold-300" />
            <h3 className="font-semibold">Active goals</h3>
          </div>
          {goals.length === 0 && <p className="text-sm text-neutral-500">No goals set yet.</p>}
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{g.title}</span>
                  <span className="text-neutral-500">{g.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-base-800 rounded-full overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${g.progress}%`, background: "linear-gradient(90deg, #806515, #f2c94c)" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/goals" className="text-sm text-gold-300 hover:underline block mt-3">
            View all goals →
          </Link>
        </div>

        <div className="card p-4 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} className="text-gold-300" />
            <h3 className="font-semibold">Notes from your PT</h3>
          </div>
          {ptNotes.length === 0 && <p className="text-sm text-neutral-500">Nothing yet.</p>}
          <div className="space-y-2">
            {ptNotes.map((n) => (
              <div key={n.id} className="bg-base-850 border border-white/[0.05] rounded-lg p-2 text-sm">
                <p className="text-neutral-200">{n.content}</p>
                <span className="text-xs text-neutral-500">
                  {n.author?.username || n.author?.full_name || "Your PT"} ·{" "}
                  {format(new Date(n.created_at), "d MMM, HH:mm")}
                </span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/messages" className="text-sm text-gold-300 hover:underline block mt-3">
            Message your trainer →
          </Link>
        </div>
      </div>

      <NoticeBoard userId={userId} canPost={false} />
    </div>
  );
}
