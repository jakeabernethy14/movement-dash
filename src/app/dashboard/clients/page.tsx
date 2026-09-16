"use client";
import { useCallback, useEffect, useState } from "react";
import { subDays } from "date-fns";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { dateKey } from "@/lib/dashboard";
import ClientRoster, { type RosterClient } from "@/components/ClientRoster";
export default function ClientsPage() {
  const supabase = createClient();
  const session = useSession();
  const [clients, setClients] = useState<RosterClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!session.userId || !(session.isTrainer || session.isOwner)) return;
    setLoading(true); setError("");
    try {
      // Keep the roster scoped to this trainer. Owner-wide management remains on /dashboard/owner.
      const { data, error: rosterError } = await supabase.from("pt_clients").select("description, status, client:profiles!pt_clients_client_id_fkey(id, full_name, email, avatar_url, access_expires_at, disabled)").eq("pt_id", session.userId).order("created_at", { ascending: false });
      if (rosterError) throw rosterError;
      const list: RosterClient[] = (data ?? []).flatMap((r: any) => r.client ? [{ id: r.client.id, name: r.client.full_name, email: r.client.email, avatarUrl: r.client.avatar_url, expiresAt: r.client.access_expires_at, disabled: r.client.disabled, description: r.description, status: r.status, unread: false }] : []);
      const ids = list.map(c => c.id);
      if (ids.length) {
        const since = subDays(new Date(), 2);
        const [messages, logs, responses] = await Promise.all([
          supabase.from("messages").select("sender_id").in("sender_id", ids).eq("recipient_id", session.userId).eq("read", false),
          supabase.from("daily_logs").select("client_id").in("client_id", ids).gte("log_date", dateKey(since)),
          supabase.from("schedule_events").select("client_id").eq("pt_id", session.userId).in("client_id", ids).not("client_response", "is", null).gte("responded_at", since.toISOString()),
        ]);
        if (messages.error || logs.error || responses.error) setError("Your clients loaded, but some recent activity could not be refreshed. Try again to update it.");
        const unread = new Set((messages.data ?? []).map(m => m.sender_id));
        const logged = new Set((logs.data ?? []).map(l => l.client_id));
        const responded = new Set((responses.data ?? []).map(r => r.client_id));
        list.forEach(c => { c.unread = unread.has(c.id); c.newLog = logged.has(c.id); c.newResponse = responded.has(c.id); });
      }
      setClients(list);
    } catch { setError("We couldn't load your client roster. Check your connection and try again."); }
    finally { setLoading(false); }
  }, [session.userId, session.isTrainer, session.isOwner, supabase]);
  useEffect(() => { load(); }, [load]);
  if (!session.loading && !(session.isTrainer || session.isOwner)) return <div className="empty-state">This page is for trainers and studio owners.</div>;
  return <>{error && <div className="error-banner" role="alert"><AlertCircle size={17}/>{error}<button onClick={load}>Try again</button></div>}<ClientRoster clients={clients} loading={loading}/></>;
}
