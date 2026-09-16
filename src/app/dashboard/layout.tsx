"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { dateKey, expiresSoon } from "@/lib/dashboard";
import DashboardShell, { type WorkspaceAlert } from "@/components/DashboardShell";
import type { SearchClient } from "@/components/CommandPalette";
import LockedAccountScreen from "@/components/LockedAccountScreen";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [clients, setClients] = useState<SearchClient[]>([]);
  const [alerts, setAlerts] = useState<WorkspaceAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const staff = session.isTrainer || session.isOwner;
  const loadAlerts = useCallback(async () => {
    if (!session.userId) return;
    setAlertsLoading(true); setAlertsError(false);
    try {
      const [messages, events, roster] = await Promise.all([
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", session.userId).eq("read", false),
        supabase.from("schedule_events").select("id, title, start_time, client_id, event_scope").eq(staff ? "pt_id" : "client_id", session.userId).eq("event_date", dateKey()).eq("client_completed", false).neq("event_type", "rest").order("start_time").limit(8),
        staff ? supabase.from("pt_clients").select("client:profiles!pt_clients_client_id_fkey(id, full_name, access_expires_at)").eq("pt_id", session.userId) : Promise.resolve({ data: [], error: null }),
      ]);
      if (messages.error || events.error || roster.error) throw new Error("Could not refresh notifications");
      const next: WorkspaceAlert[] = [];
      if (messages.count) next.push({ id: "messages", kind: "message", title: `${messages.count} unread message${messages.count === 1 ? "" : "s"}`, detail: "Pick up where you left off with your conversations.", href: "/dashboard/messages" });
      const people = (roster.data ?? []).flatMap((row: any) => row.client ? [row.client] : []);
      setClients(people.map((c: any) => ({ id: c.id, name: c.full_name })));
      people.filter((c: any) => expiresSoon(c.access_expires_at)).forEach((c: any) => next.push({ id: `renew-${c.id}`, kind: "renewal", title: `${c.full_name}: renewal coming up`, detail: `Account access ends ${new Date(c.access_expires_at).toLocaleDateString()}.`, href: `/dashboard/clients/${c.id}` }));
      if (!staff && expiresSoon(session.profile?.access_expires_at ?? null)) next.push({ id: "my-renewal", kind: "renewal", title: "Your account renewal is coming up", detail: "Contact your trainer to keep your coaching going.", href: "/dashboard/messages" });
      (events.data ?? []).forEach(e => next.push({ id: e.id, kind: "session", title: e.title, detail: `Today${e.start_time ? ` at ${e.start_time.slice(0, 5)}` : " - scheduled for you"}`, href: !staff ? "/dashboard/schedule" : e.client_id ? `/dashboard/clients/${e.client_id}` : "/dashboard/sessions" }));
      setAlerts(next);
    } catch { setAlertsError(true); }
    finally { setAlertsLoading(false); }
  }, [session.userId, session.profile?.access_expires_at, staff, supabase]);
  useEffect(() => { loadAlerts(); window.addEventListener("focus", loadAlerts); return () => window.removeEventListener("focus", loadAlerts); }, [loadAlerts, pathname]);
  async function logout() {
    setLogoutError("");
    const { error } = await supabase.auth.signOut();
    if (error) { setLogoutError("Unable to sign out. Check your connection and try again."); return; }
    router.push("/"); router.refresh();
  }
  const expired = !session.loading && session.profile?.access_expires_at && new Date(session.profile.access_expires_at) < new Date();
  if (expired && session.userId && session.profile) return <LockedAccountScreen userId={session.userId} fullName={session.profile.full_name} email={session.profile.email}/>;
  return <DashboardShell name={session.profile?.full_name || "Loading..."} avatarUrl={session.profile?.avatar_url} timezone={session.profile?.timezone || "Pacific/Auckland"} staff={staff} owner={session.isOwner} clients={clients} alerts={alerts} alertsLoading={alertsLoading} alertsError={alertsError} onRefreshAlerts={loadAlerts} onLogout={logout}>{logoutError && <div className="error-banner" role="alert">{logoutError}</div>}{children}</DashboardShell>;
}
