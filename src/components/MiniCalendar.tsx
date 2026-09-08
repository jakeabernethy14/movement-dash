"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

interface Props {
  markedDates?: string[]; // ISO yyyy-MM-dd strings that get a gold dot
  onSelectDate?: (date: Date) => void;
}

export default function MiniCalendar({ markedDates = [], onSelectDate }: Props) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const markedSet = new Set(markedDates);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(subMonths(cursor, 1))}
          className="p-1 rounded hover:bg-base-800 text-neutral-400"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium">{format(cursor, "MMMM yyyy")}</span>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="p-1 rounded hover:bg-base-800 text-neutral-400"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-500 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          const isSelected = selected && isSameDay(d, selected);
          return (
            <button
              key={iso}
              onClick={() => {
                setSelected(d);
                onSelectDate?.(d);
              }}
              className={`relative text-xs h-8 rounded-lg flex items-center justify-center transition-colors
                ${inMonth ? "text-neutral-200" : "text-neutral-600"}
                ${isSelected ? "bg-gold-500 text-base-950 font-semibold" : "hover:bg-base-800"}
                ${isToday && !isSelected ? "border border-gold-500/50" : ""}
              `}
            >
              {format(d, "d")}
              {markedSet.has(iso) && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-gold-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
