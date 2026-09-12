"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";
import { metricColor } from "@/lib/metricColor";

const GOLD = "#D4AF37";

export default function PtProgressPage() {
  const supabase = createClient();
  const session = useSession();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [weightData, setWeightData] = useState<any[]>([]);
  const [bodyFatData, setBodyFatData] = useState<any[]>([]);
  const [latestMeasurements, setLatestMeasurements] = useState<Record<string, number> | null>(null);
  const [pbGroups, setPbGroups] = useState<Record<string, any[]>>({});
  const [goals, setGoals] = useState<any[]>([]);
  const [averages, setAverages] = useState({ sleep: null as number | null, energy: null as number | null, stress: null as number | null, logRate: 0 });
  const [adherence, setAdherence] = useState({ workout: 0, nutrition: 0 });
  const [flags, setFlags] = useState<string[]>([]);

  useEffect(() => {
    if (!session.userId) return;
    supabase
      .from("pt_clients")
      .select("client:profiles!pt_clients_client_id_fkey(id, full_name)")
      .eq("pt_id", session.userId)
      .then(({ data }) => {
        const list = (data ?? []).map((r: any) => r.client).filter(Boolean);
        setClients(list);
        if (list[0]) setSelectedClient(list[0].id);
      });
  }, [session.userId]); // eslint-disable-line

  useEffect(() => {
    if (!selectedClient) return;
    loadClientProgress(selectedClient);
  }, [selectedClient]); // eslint-disable-line

  async function loadClientProgress(clientId: string) {
    const since30 = format(subDays(new Date(), 30), "yyyy-MM-dd");

    const [{ data: logs }, { data: checkups }, { data: pbs }, { data: goalData }, { data: sessions }] = await Promise.all([
      supabase.from("daily_logs").select("*").eq("client_id", clientId).order("log_date", { ascending: true }),
      supabase.from("checkups").select("*").eq("client_id", clientId).order("checkup_date", { ascending: true }),
      supabase.from("personal_bests").select("*").eq("client_id", clientId).order("pb_date", { ascending: true }),
      supabase.from("goals").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("schedule_events").select("*").eq("client_id", clientId).eq("event_type", "training").gte("event_date", since30),
    ]);

    setWeightData((logs ?? []).filter((l) => l.weight_kg != null).map((l) => ({ date: l.log_date, weight: l.weight_kg })));
    setBodyFatData((checkups ?? []).filter((c) => c.body_fat_pct != null).map((c) => ({ date: c.checkup_date, fat: c.body_fat_pct })));
    const lastCheckup = [...(checkups ?? [])].reverse().find((c) => c.measurements && Object.keys(c.measurements).length > 0);
    setLatestMeasurements(lastCheckup?.measurements ?? null);

    const groups: Record<string, any[]> = {};
    (pbs ?? []).forEach((pb) => {
      groups[pb.exercise] = groups[pb.exercise] || [];
      groups[pb.exercise].push(pb);
    });
    setPbGroups(groups);
    setGoals(goalData ?? []);

    const recentLogs = (logs ?? []).filter((l) => l.log_date >= since30);
    const avg = (key: string) => {
      const vals = recentLogs.map((l: any) => l[key]).filter((v: any) => v != null);
      return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
    };
    setAverages({
      sleep: avg("sleep_hours"),
      energy: avg("energy_level"),
      stress: avg("stress_level"),
      logRate: Math.round((recentLogs.length / 30) * 100),
    });

    const completedSessions = (sessions ?? []).filter((s) => s.client_completed).length;
    const workoutAdherence = sessions && sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0;
    setAdherence({ workout: workoutAdherence, nutrition: Math.round((recentLogs.length / 30) * 100) });

    const newFlags: string[] = [];
    const weightPoints = (logs ?? []).filter((l) => l.weight_kg != null && l.log_date >= since30);
    if (weightPoints.length >= 2) {
      const delta = weightPoints[weightPoints.length - 1].weight_kg - weightPoints[0].weight_kg;
      if (Math.abs(delta) >= 0.3) newFlags.push(`${delta > 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)}kg bodyweight over 30 days`);
    }
    Object.entries(groups).forEach(([exercise, entries]) => {
      const nums = entries.map((e) => parseFloat(e.weight)).filter((n) => !isNaN(n));
      if (nums.length >= 2) {
        const delta = nums[nums.length - 1] - nums[0];
        if (delta > 0) newFlags.push(`↑ ${delta.toFixed(1)} on ${exercise}`);
      }
    });
    setFlags(newFlags);
  }

  const clientName = clients.find((c) => c.id === selectedClient)?.full_name ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Client Progress</h1>
          <p className="text-neutral-400 text-sm">Their entire journey in one place.</p>
        </div>
        <select className="input-field w-56" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
          {clients.length === 0 && <option value="">No clients yet</option>}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </div>

      {!selectedClient ? (
        <p className="text-neutral-500">Select a client to view their progress.</p>
      ) : (
        <>
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {flags.map((f, i) => <span key={i} className="badge badge-gold">{f}</span>)}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kpi-card">
              <span className="text-neutral-400 text-sm">Workout adherence</span>
              <span className="text-2xl font-bold" style={{ color: metricColor("percent", adherence.workout).text }}>{adherence.workout}%</span>
            </div>
            <div className="kpi-card">
              <span className="text-neutral-400 text-sm">Nutrition logging</span>
              <span className="text-2xl font-bold" style={{ color: metricColor("percent", adherence.nutrition).text }}>{adherence.nutrition}%</span>
            </div>
            <div className="kpi-card">
              <span className="text-neutral-400 text-sm">Avg sleep (30d)</span>
              <span className="text-2xl font-bold" style={{ color: metricColor("sleep", averages.sleep).text }}>{averages.sleep ? `${averages.sleep.toFixed(1)}h` : "—"}</span>
            </div>
            <div className="kpi-card">
              <span className="text-neutral-400 text-sm">Avg energy (30d)</span>
              <span className="text-2xl font-bold" style={{ color: metricColor("energy", averages.energy).text }}>{averages.energy ? `${averages.energy.toFixed(1)}/5` : "—"}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-4">
              <h3 className="font-semibold mb-3">Weight over time</h3>
              {weightData.length === 0 ? (
                <p className="text-sm text-neutral-500">No weight logs yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
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
            <div className="card p-4">
              <h3 className="font-semibold mb-3">Body fat % over time</h3>
              {bodyFatData.length === 0 ? (
                <p className="text-sm text-neutral-500">No body fat % logged yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={bodyFatData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a3a3a3" }} tickFormatter={(d) => format(new Date(d), "d MMM")} />
                    <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="fat" stroke="#7DB8E8" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
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

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-4">
              <h3 className="font-semibold mb-3">Strength progression</h3>
              {Object.keys(pbGroups).length === 0 ? (
                <p className="text-sm text-neutral-500">No PBs logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(pbGroups).map(([exercise, entries]) => (
                    <div key={exercise} className="bg-base-850 border border-white/[0.06] rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">{exercise}</p>
                      {entries.slice(-3).map((e) => (
                        <div key={e.id} className="flex justify-between text-xs text-neutral-400">
                          <span>{e.pb_date}</span>
                          <span className="text-gold-300">{e.weight} {e.reps_or_time ? `· ${e.reps_or_time}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4">
              <h3 className="font-semibold mb-3">Goal progress</h3>
              {goals.length === 0 ? (
                <p className="text-sm text-neutral-500">No goals set.</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((g) => (
                    <div key={g.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{g.title}</span>
                        <span className="text-neutral-500">{g.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-base-800 rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${g.progress}%`, background: "linear-gradient(90deg, #806515, #f2c94c)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
