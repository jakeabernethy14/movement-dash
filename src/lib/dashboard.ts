import { format, addDays, startOfDay, differenceInCalendarDays } from "date-fns";
import type { ScheduleEvent } from "./types";
export interface DashboardClient { id: string; name: string; email: string; avatarUrl?: string | null; description: string; status: string; expiresAt: string | null; disabled?: boolean; unread: boolean; lastLog?: string }
export interface DashboardEvent extends ScheduleEvent { client?: { full_name: string; avatar_url?: string | null } | null }
export interface ActivityDay { date: string; label: string; planned: number; completed: number }
export interface CoachDashboardData { clients: DashboardClient[]; planCount: number; upcomingCount: number; activity: ActivityDay[]; selectedDate: string; dayEvents: DashboardEvent[] }
export const dateKey = (date = new Date()) => format(date, "yyyy-MM-dd");
export function isExpired(expiry: string | null, now = new Date()): boolean { return !!expiry && new Date(expiry).getTime() < now.getTime(); }
export function expiresSoon(expiry: string | null, now = new Date()): boolean { return !!expiry && !isExpired(expiry, now) && new Date(expiry).getTime() <= addDays(now, 7).getTime(); }
export function clientStatus(client: { expiresAt: string | null; status: string; disabled?: boolean }): string { return client.disabled ? "paused" : isExpired(client.expiresAt) ? "expired" : client.status; }
export function buildActivity(events: DashboardEvent[], now = new Date()): ActivityDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startOfDay(now), i - 6); const key = dateKey(day);
    const scheduled = events.filter(e => e.event_date === key && e.event_type === "training" && e.event_scope === "client");
    return { date: key, label: format(day, "EEE"), planned: scheduled.length, completed: scheduled.filter(e => e.client_completed).length };
  });
}
export function daysUntil(expiry: string) { return Math.max(0, differenceInCalendarDays(new Date(expiry), new Date())); }
export function localDateLabel(iso: string, pattern = "d MMM") { return format(new Date(iso + "T12:00:00"), pattern); }
