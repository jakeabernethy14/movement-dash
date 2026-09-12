"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";
import { metricColor } from "@/lib/metricColor";

const GOLD = "#D4AF37";

export default function ProgressPage() {
  const supabase = createClient();
  const session = useSession();
  const [weightData, setWeightData] = useState<any[]>([]);
  const [latestMeasurements, setLatestMeasurements] = useState<Record<string, number> | null>(null);
  const [pbGroups, setPbGroups] = useState<Record<string, any[]>>({});
  const [averages, setAverages] = useState({ sleep: null as number | null, energy: null as number | null, logRate: 0 });
  const [flags, setFlags] = useState<string[]>([]);

  async function load() {
    if (!session.userId) return;
    const since30 = format(subDays(new Date(), 30), "yyyy-MM-dd");

    const [{ data: logs }, { data: checkups }, { data: pbs }] = await Promise.all([
      supabase.from("daily_logs").select("*").eq("client_id", session.userId).order("log_date", { ascending: true }),
      supabase.from("checkups").select("*").eq("client_id", session.userId).order("checkup_date", { ascending: true }),
      supabase.from("personal_bests").select("*").eq("client_id", session.userId).order("pb_date", { ascending: true }),
    ]);

    setWeightData(
      (logs ?? [])
        .filter((l) => l.weight_kg != null)
        .map((l) => ({ date: l.log_date, weight: l.weight_kg }))
    );
    const lastCheckup = [...(checkups ?? [])].reverse().find((c) => c.measurements && Object.keys(c.measurements).length > 0);
    setLatestMeasurements(lastCheckup?.measurements ?? null);

    const groups: Record<string, any[]> = {};
    (pbs ?? []).forEach((pb) => {
      groups[pb.exercise] = groups[pb.exercise] || [];
      groups[pb.exercise].push(pb);
    });
    setPbGroups(groups);

    const recentLogs = (logs ?? []).filter((l) => l.log_date >= since30);
    const avg = (key: string) => {
      const vals = recentLogs.map((l: any) => l[key]).filter((v: any) => v != null);
      return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
    };
    setAverages({
      sleep: avg("sleep_hours"),
      energy: avg("energy_level"),
      logRate: Math.round((recentLogs.length / 30) * 100),
    });

    const newFlags: string[] = [];
    const weightPoints = (logs ?? []).filter((l) => l.weight_kg != null);
    const recentWeight = weightPoints.filter((l) => l.log_date >= since30);
    if (recentWeight.length >= 2) {
      const delta = recentWeight[recentWeight.length - 1].weight_kg - recentWeight[0].weight_kg;
      if (Math.abs(delta) >= 0.3) {
        newFlags.push(`${delta > 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)}kg bodyweight over 30 days`);
      }
    }
    Object.entries(groups).forEach(([exercise, entries]) => {
      const nums = entries.map((e) => parseFloat(e.weight)).filter((n) => !isNaN(n));
      if (nums.length >= 2) {
        const delta = nums[nums.length - 1] - nums[0];
        if (delta > 0) newFlags.push(`↑ ${delta.toFixed(1)} on ${exercise} this period`);
      }
    });
    setFlags(newFlags);
  }

  useEffect(() => {
    load();
  }, [session.userId]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-neutral-400 text-sm">Your journey in one place.</p>
      </div>

      {flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {flags.map((f, i) => (
            <span key={i} className="badge badge-gold">
              {f}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(() => {
          const sleep = metricColor("sleep", averages.sleep);
          const energy = metricColor("energy", averages.energy);
          const logRate = metricColor("percent", averages.logRate);
          return (
            <>
              <div className="kpi-card">
                <span className="text-neutral-400 text-sm">Avg sleep (30d)</span>
                <span className="text-2xl font-bold" style={{ color: sleep.text }}>
                  {averages.sleep ? `${averages.sleep.toFixed(1)}h` : "—"}
                </span>
              </div>
              <div className="kpi-card">
                <span className="text-neutral-400 text-sm">Avg energy (30d)</span>
                <span className="text-2xl font-bold" style={{ color: energy.text }}>
                  {averages.energy ? `${averages.energy.toFixed(1)}/5` : "—"}
                </span>
              </div>
              <div className="kpi-card">
                <span className="text-neutral-400 text-sm">Logging rate (30d)</span>
                <span className="text-2xl font-bold" style={{ color: logRate.text }}>{averages.logRate}%</span>
              </div>
            </>
          );
        })()}
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Weight over time</h3>
        {weightData.length === 0 ? (
          <p className="text-sm text-neutral-500">Log your weight in Daily Log to see this chart.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weightData}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a3a3a3" }} tickFormatter={(d) => format(new Date(d), "d MMM")} />
              <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke={GOLD} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {latestMeasurements && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Latest measurements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(latestMeasurements).map(([key, val]) => (
              <div key={key} className="bg-base-850 border border-white/[0.06] rounded-lg p-3">
                <p className="text-xs text-neutral-500 capitalize">{key}</p>
                <p className="text-lg font-semibold">{val}cm</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Strength progression</h3>
        {Object.keys(pbGroups).length === 0 ? (
          <p className="text-sm text-neutral-500">Log PBs to track strength over time.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(pbGroups).map(([exercise, entries]) => (
              <div key={exercise} className="bg-base-850 border border-white/[0.06] rounded-lg p-3">
                <p className="text-sm font-medium mb-2">{exercise}</p>
                <div className="space-y-1">
                  {entries.slice(-4).map((e) => (
                    <div key={e.id} className="flex justify-between text-xs text-neutral-400">
                      <span>{e.pb_date}</span>
                      <span className="text-gold-300">{e.weight} {e.reps_or_time ? `· ${e.reps_or_time}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
