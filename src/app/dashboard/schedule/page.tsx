"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Download } from "lucide-react";
import { exportSchedulePDF } from "@/lib/pdf";

export default function SchedulePage() {
  const supabase = createClient();
  const session = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthEvents, setMonthEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!session.userId) return;
    async function load() {
      const start = format(startOfMonth(selectedDate), "yyyy-MM-dd");
      const end = format(endOfMonth(selectedDate), "yyyy-MM-dd");
      const { data } = await supabase
        .from("schedule_events")
        .select("*")
        .eq("client_id", session.userId)
        .gte("event_date", start)
        .lte("event_date", end)
        .order("event_date", { ascending: true });
      setMonthEvents(data ?? []);
      setEvents((data ?? []).filter((e) => e.event_date === format(selectedDate, "yyyy-MM-dd")));
    }
    load();
  }, [session.userId, selectedDate]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule / Program</h1>
          <p className="text-neutral-400 text-sm">Your training calendar.</p>
        </div>
        <button
          onClick={() =>
            exportSchedulePDF(monthEvents, session.profile?.full_name ?? "Client", format(selectedDate, "MMMM yyyy"))
          }
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Download size={14} /> Export month PDF
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <SimpleMonthCalendar
            events={monthEvents}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </div>
        <div className="md:col-span-2 card p-4">
          <h3 className="font-semibold mb-3">{format(selectedDate, "EEEE, d MMMM yyyy")}</h3>
          {events.length === 0 && <p className="text-sm text-neutral-500">Nothing scheduled this day.</p>}
          <div className="space-y-3">
            {events.map((e) => (
              <div key={e.id} className="bg-base-850 border border-base-border rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{e.title}</span>
                  <span className="badge badge-gold">{e.event_type}</span>
                </div>
                {(e.start_time || e.end_time) && (
                  <p className="text-xs text-neutral-500 mt-1">
                    {e.start_time?.slice(0, 5)} {e.end_time ? `– ${e.end_time.slice(0, 5)}` : ""}
                  </p>
                )}
                {e.description && <p className="text-sm text-neutral-300 mt-2">{e.description}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleMonthCalendar({
  events,
  selectedDate,
  onSelect,
}: {
  events: any[];
  selectedDate: Date;
  onSelect: (d: Date) => void;
}) {
  const marked = new Set(events.map((e) => e.event_date));
  const start = startOfMonth(selectedDate);
  const end = endOfMonth(selectedDate);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const leadingBlanks = (start.getDay() + 6) % 7; // Monday-first

  return (
    <div className="card p-4">
      <p className="text-sm font-medium mb-3">{format(selectedDate, "MMMM yyyy")}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-500 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={"b" + i} />
        ))}
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const isSelected = format(selectedDate, "yyyy-MM-dd") === iso;
          return (
            <button
              key={iso}
              onClick={() => onSelect(d)}
              className={`relative text-xs h-8 rounded-lg flex items-center justify-center ${
                isSelected ? "bg-gold-500 text-base-950 font-semibold" : "hover:bg-base-800 text-neutral-200"
              }`}
            >
              {format(d, "d")}
              {marked.has(iso) && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-gold-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
