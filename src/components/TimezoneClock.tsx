"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function TimezoneClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  let timeStr = "";
  let tzLabel = timezone;
  try {
    timeStr = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);
  } catch {
    timeStr = now.toLocaleTimeString();
    tzLabel = "Local";
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
      <Clock size={12} className="text-gold-400" />
      <span className="text-neutral-300 font-medium">{timeStr}</span>
      <span className="truncate max-w-[7rem]">{tzLabel.replace(/_/g, " ")}</span>
    </div>
  );
}
