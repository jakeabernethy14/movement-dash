"use client";
import { useCallback, useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { dateKey, buildActivity, type DashboardEvent } from "@/lib/dashboard";
import type { Goal } from "@/lib/types";
import ClientDashboardView, { type ClientDashboardData } from "./ClientDashboardView";
import NoticeBoard from "./NoticeBoard";
import Avatar from "./Avatar";
const empty: ClientDashboardData = { trainerName: "", planTitle: null, todayEvents: [], upcomingEvents: [], activity: [], goals: [], loggedDays: 0, loggedToday: false, bestCount: 0 };
export default function ClientOverview({ userId }: { userId: string }) {
  const supabase = createClient();
  const session = useSession();
  const [data, setData] = useState<ClientDashboardData>(empty);
  const [notes, setNotes] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const today = dateKey(), since = dateKey(addDays(new Date(), -6)), until = dateKey(addDays(new Date(), 6));
      const [pt, events, goals, logs, bests, plan, sharedNotes] = await Promise.all([
        supabase.from("pt_clients").select("pt:profiles!pt_clients_pt_id_fkey(full_name)").eq("client_id", userId).limit(1).maybeSingle(),
        supabase.from("schedule_events").select("*").eq("client_id", userId).gte("event_date", since).lte("event_date", until).order("event_date").order("start_time"),
        supabase.from("goals").select("*").eq("client_id", userId).eq("status", "in_progress").order("target_date"),
        supabase.from("daily_logs").select("log_date").eq("client_id", userId).gte("log_date", since).lte("log_date", today),
        supabase.from("personal_bests").select("id", { count: "exact", head: true }).eq("client_id", userId),
        supabase.from("assigned_programs").select("plan:training_plans(title)").eq("client_id", userId).lte("start_date", today).or(`end_date.is.null,end_date.gte.${today}`).order("start_date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("notes").select("*, author:profiles!notes_author_id_fkey(full_name, username, avatar_url)").eq("client_id", userId).eq("visibility", "shared").neq("author_id", userId).order("created_at", { ascending: false }).limit(3),
      ]);
      for (const r of [pt, events, goals, logs, bests, plan, sharedNotes]) if (r.error) throw r.error;
      const allEvents = (events.data ?? []) as DashboardEvent[];
      setData({ trainerName: (pt.data as any)?.pt?.full_name ?? "", planTitle: (plan.data as any)?.plan?.title ?? null, todayEvents: allEvents.filter(e => e.event_date === today), upcomingEvents: allEvents.filter(e => e.event_date > today), activity: buildActivity(allEvents), goals: (goals.data ?? []) as Goal[], loggedDays: new Set((logs.data ?? []).map(l => l.log_date)).size, loggedToday: (logs.data ?? []).some(l => l.log_date === today), bestCount: bests.count ?? 0 });
      setNotes(sharedNotes.data ?? []);
      const ids = [...new Set((sharedNotes.data ?? []).map(n => n.author_id))];
      if (ids.length) {
        const { data: types } = await supabase.from("account_types").select("profile_id, type").in("profile_id", ids);
        const map: Record<string, string[]> = {};
        (types ?? []).forEach(t => { (map[t.profile_id] ??= []).push(t.type); }); setRoles(map);
      }
    } catch { setError("We couldn't refresh your overview. Please check your connection and try again."); }
    finally { setLoading(false); }
  }, [supabase, userId]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <div aria-busy="true" aria-label="Loading your overview"><div className="skeleton h-12 w-64 mb-6"/><div className="skeleton h-52 mb-5"/><div className="stats-grid">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-32"/>)}</div><div className="skeleton h-64"/></div>;
  return <>{error && <div className="error-banner" role="alert"><AlertCircle size={17}/>{error}<button onClick={load}>Try again</button></div>}<ClientDashboardView name={session.profile?.full_name || "there"} data={data}/><div className="dashboard-secondary"><section className="card panel"><div className="panel-heading"><div><h2>A note from your coach</h2><p>Guidance for the journey ahead.</p></div><MessageCircle size={17} className="gold-text"/></div>{!notes.length && <p className="empty-state">Your coach's shared notes will appear here.</p>}{notes.map(n => <div className="coach-note-item" key={n.id}><p>{n.content}</p><div><Avatar name={n.author?.full_name} url={n.author?.avatar_url} size={22}/><span>{n.author?.username || n.author?.full_name || "Your coach"}{(roles[n.author_id]?.includes("owner") || roles[n.author_id]?.includes("trainer")) && <span className="text-green-400"> / {roles[n.author_id]?.includes("owner") ? "Owner" : "Trainer"}</span>}<small>{format(new Date(n.created_at), "d MMM, HH:mm")}</small></span></div></div>)}<Link href="/dashboard/messages" className="panel-action mt-4">Message your coach<ArrowUpRight size={12}/></Link></section><NoticeBoard userId={userId} canPost={false}/></div></>;
}
