"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";

const TYPE_COLOR: Record<string, string> = {
  training: "#D4AF37",
  checkup: "#7DB8E8",
  rest: "#8a8a8a",
  note: "#B98CE0",
  class: "#D4AF37",
  call: "#7DB8E8",
  other: "#8a8a8a",
};

export default function ClientCalendarPage() {
  const supabase = createClient();
  const session = useSession();
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selected, setSelected] = useState<Date>(new Date());

  useEffect(() => {
    if (!session.userId) return;
    const start = format(startOfMonth(cursor), "yyyy-MM-dd");
    const end = format(endOfMonth(cursor), "yyyy-MM-dd");
    supabase
      .from("schedule_events")
      .select("*, pt:profiles!schedule_events_pt_id_fkey(full_name, avatar_url)")
      .eq("client_id", session.userId)
      .gte("event_date", start)
      .lte("event_date", end)
      .order("start_time", { ascending: true })
      .then(({ data }) => setEvents(data ?? []));
  }, [session.userId, cursor]); // eslint-disable-line

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const eventsByDay: Record<string, any[]> = {};
  events.forEach((e) => {
    eventsByDay[e.event_date] = eventsByDay[e.event_date] || [];
    eventsByDay[e.event_date].push(e);
  });

  const selectedEvents = eventsByDay[format(selected, "yyyy-MM-dd")] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-neutral-400 text-sm">Everything your trainer has programmed for you.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCursor(subMonths(cursor, 1))} className="p-1.5 rounded hover:bg-white/5 text-neutral-400">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold">{format(cursor, "MMMM yyyy")}</span>
            <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-1.5 rounded hover:bg-white/5 text-neutral-400">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = format(d, "yyyy-MM-dd");
              const inMonth = isSameMonth(d, cursor);
              const isSelected = isSameDay(d, selected);
              const isToday = isSameDay(d, new Date());
              const dayEvents = eventsByDay[iso] ?? [];
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(d)}
                  className={`text-left rounded-lg p-1.5 h-20 sm:h-24 flex flex-col gap-1 transition-colors border ${
                    isSelected ? "border-gold-400/50" : "border-white/[0.04] hover:border-white/[0.1]"
                  }`}
                  style={{
                    background: isSelected ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <span
                    className={`text-xs ${inMonth ? "text-neutral-300" : "text-neutral-600"} ${
                      isToday ? "text-gold-300 font-semibold" : ""
                    }`}
                  >
                    {format(d, "d")}
                  </span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className="text-[10px] truncate rounded px-1 py-0.5"
                        style={{ background: `${TYPE_COLOR[e.event_type] ?? "#D4AF37"}22`, color: TYPE_COLOR[e.event_type] ?? "#D4AF37" }}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-neutral-500">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">{format(selected, "EEEE, d MMMM")}</h3>
          {selectedEvents.length === 0 && <p className="text-sm text-neutral-500">Nothing scheduled.</p>}
          <div className="space-y-2">
            {selectedEvents.map((e) => (
              <div key={e.id} className="bg-base-850 border border-white/[0.05] rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{e.title}</span>
                  <span style={{ color: TYPE_COLOR[e.event_type] ?? "#D4AF37" }} className="text-xs">
                    {e.event_type}
                  </span>
                </div>
                {(e.start_time || e.end_time) && (
                  <p className="text-xs text-neutral-500 mt-1">
                    {e.start_time?.slice(0, 5)} {e.end_time ? `– ${e.end_time.slice(0, 5)}` : ""}
                  </p>
                )}
                {e.pt?.full_name && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Avatar url={e.pt.avatar_url} name={e.pt.full_name} size={16} />
                    <span className="text-xs text-neutral-500">Set by {e.pt.full_name}</span>
                  </div>
                )}
                {e.description && <p className="text-neutral-300 mt-2">{e.description}</p>}
                {e.client_response && (
                  <p className="text-green-400 text-xs mt-2 border-t border-green-800/40 pt-2">
                    ✓ You logged a result for this session
                  </p>
                )}
              </div>
            ))}
          </div>
          <a href="/dashboard/schedule" className="text-sm text-gold-300 hover:underline block mt-3">
            Log a result for a session →
          </a>
        </div>
      </div>
    </div>
  );
}
