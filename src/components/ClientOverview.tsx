"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Target, MessageCircle, CalendarDays } from "lucide-react";
import Link from "next/link";

export default function ClientOverview({ userId }: { userId: string }) {
  const supabase = createClient();
  const [weekEvents, setWeekEvents] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [ptNotes, setPtNotes] = useState<any[]>([]);
  const [ptName, setPtName] = useState<string>("");

  useEffect(() => {
    async function load() {
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);

      const { data: pt } = await supabase
        .from("pt_clients")
        .select("pt_id, pt:profiles!pt_clients_pt_id_fkey(full_name)")
        .eq("client_id", userId)
        .single();
      // @ts-ignore
      setPtName(pt?.pt?.full_name ?? "");

      const { data: events } = await supabase
        .from("schedule_events")
        .select("*")
        .eq("client_id", userId)
        .gte("event_date", format(new Date(), "yyyy-MM-dd"))
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
        .select("*")
        .eq("client_id", userId)
        .eq("visibility", "shared")
        .order("created_at", { ascending: false })
        .limit(3);
      setPtNotes(notes ?? []);
    }
    load();
  }, [userId]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        {ptName && <p className="text-neutral-400 text-sm">Trainer: {ptName}</p>}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-4 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-gold-400" />
            <h3 className="font-semibold">This week</h3>
          </div>
          {weekEvents.length === 0 && (
            <p className="text-sm text-neutral-500">No sessions scheduled.</p>
          )}
          <div className="space-y-2">
            {weekEvents.map((e) => (
              <div key={e.id} className="bg-base-850 border border-base-border rounded-lg p-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-gold-400">{e.start_time?.slice(0, 5) ?? ""}</span>
                </div>
                <span className="text-xs text-neutral-500">
                  {format(new Date(e.event_date), "EEE d MMM")}
                </span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/schedule" className="text-sm text-gold-400 hover:underline block mt-3">
            View full schedule →
          </Link>
        </div>

        <div className="card p-4 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-gold-400" />
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
                    className="h-full bg-gold-500"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/goals" className="text-sm text-gold-400 hover:underline block mt-3">
            View all goals →
          </Link>
        </div>

        <div className="card p-4 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} className="text-gold-400" />
            <h3 className="font-semibold">Notes from your PT</h3>
          </div>
          {ptNotes.length === 0 && <p className="text-sm text-neutral-500">Nothing yet.</p>}
          <div className="space-y-2">
            {ptNotes.map((n) => (
              <div key={n.id} className="bg-base-850 border border-base-border rounded-lg p-2 text-sm">
                <p className="text-neutral-200">{n.content}</p>
                <span className="text-xs text-neutral-500">
                  {format(new Date(n.created_at), "d MMM, HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
