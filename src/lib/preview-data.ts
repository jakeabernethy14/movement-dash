/** Fictional, public preview fixtures. Never queried by the signed-in dashboards. */
import { addDays } from "date-fns";
import { dateKey, type CoachDashboardData, type DashboardEvent } from "./dashboard";
import type { RosterClient } from "@/components/ClientRoster";
import type { ClientDashboardData } from "@/components/ClientDashboardView";
const expiry = (days: number) => addDays(new Date(), days).toISOString();
export function previewClients(): RosterClient[] {
  return [
    { name: "Taylor Brooks", email: "taylor@example.com", description: "Strength & everyday confidence", expiresAt: expiry(36), status: "active", unread: true, newLog: true, newResponse: true },
    { name: "Jordan Mitchell", email: "jordan@example.com", description: "Building a consistent routine", expiresAt: expiry(4), status: "active", unread: true, newLog: true },
    { name: "Casey Williams", email: "casey@example.com", description: "Strength fundamentals", expiresAt: expiry(65), status: "active", unread: false, newLog: true, newResponse: true },
    { name: "Riley Parker", email: "riley@example.com", description: "A stronger everyday", expiresAt: expiry(2), status: "active", unread: false, newLog: true },
    { name: "Morgan Reed", email: "morgan@example.com", description: "Training for the long run", expiresAt: expiry(24), status: "active", unread: false, newResponse: true },
    { name: "Jamie Wilson", email: "jamie@example.com", description: "Back to basics", expiresAt: expiry(45), status: "paused", unread: false },
    { name: "Sam Carter", email: "sam@example.com", description: "Mobility & strength", expiresAt: expiry(58), status: "active", unread: false, newLog: true },
    { name: "Charlie Lewis", email: "charlie@example.com", description: "Making time for movement", expiresAt: expiry(-3), status: "active", unread: false },
  ].map((c, i) => ({ ...c, id: `demo-client-${i}`, avatarUrl: null }));
}
function event(id: string, title: string, time: string, person?: string, day = 0, completed = false): DashboardEvent {
  return { id, client_id: person ? "demo-client-0" : null, pt_id: "demo-coach", title, description: "Fictional preview session", event_date: dateKey(addDays(new Date(), day)), start_time: time, end_time: null, event_type: person ? "training" : "class", event_scope: person ? "client" : "personal", client_response: completed ? "Feeling good after that session." : null, client_completed: completed, responded_at: null, created_at: new Date().toISOString(), client: person ? { full_name: person } : null };
}
export function previewCoachData(): CoachDashboardData {
  const planned = [8, 7, 9, 6, 10, 4, 7], completed = [6, 6, 8, 5, 9, 3, 5];
  return { clients: previewClients(), planCount: 12, upcomingCount: 18, selectedDate: dateKey(), activity: planned.map((n, i) => { const d = addDays(new Date(), i - 6); return { date: dateKey(d), label: d.toLocaleDateString("en-NZ", { weekday: "short" }), planned: n, completed: completed[i] }; }), dayEvents: [event("demo-event-1", "Lower body / strength", "07:00", "Taylor Brooks", 0, true), event("demo-event-2", "Weekly coaching check-in", "10:30", "Jordan Mitchell"), event("demo-event-3", "Small-group strength", "12:00"), event("demo-event-4", "Upper body / fundamentals", "16:30", "Casey Williams")] };
}
export function previewClientData(): ClientDashboardData {
  return { trainerName: "Alex Morgan", planTitle: "Strength foundations / Phase 02", todayEvents: [event("demo-personal-1", "Lower body / strength", "07:00", undefined, 0, true)], upcomingEvents: [event("demo-future-1", "Upper body / strength", "07:00", undefined, 1), event("demo-future-2", "Weekly coaching check-in", "10:30", undefined, 2), event("demo-future-3", "Full body / conditioning", "08:00", undefined, 4)], activity: previewCoachData().activity.map((d, i) => ({ ...d, planned: [1, 0, 1, 1, 0, 1, 1][i], completed: [1, 0, 1, 0, 0, 1, 1][i] })), goals: [{ id: "goal-1", title: "Build a consistent training routine", progress: 75, target_date: dateKey(addDays(new Date(), 24)), client_id: "demo-client-0", pt_id: "demo-coach", description: "Fictional preview goal", status: "in_progress", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { id: "goal-2", title: "Improve my squat confidence", progress: 60, target_date: dateKey(addDays(new Date(), 40)), client_id: "demo-client-0", pt_id: "demo-coach", description: "Fictional preview goal", status: "in_progress", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], loggedDays: 5, loggedToday: false, bestCount: 8 };
}
