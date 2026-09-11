"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Camera, Upload } from "lucide-react";
import { format, subDays } from "date-fns";

const GOLD = "#D4AF37";

export default function ProgressPage() {
  const supabase = createClient();
  const session = useSession();
  const [weightData, setWeightData] = useState<any[]>([]);
  const [bodyFatData, setBodyFatData] = useState<any[]>([]);
  const [latestMeasurements, setLatestMeasurements] = useState<Record<string, number> | null>(null);
  const [pbGroups, setPbGroups] = useState<Record<string, any[]>>({});
  const [photos, setPhotos] = useState<any[]>([]);
  const [averages, setAverages] = useState({ sleep: null as number | null, energy: null as number | null, stress: null as number | null, logRate: 0 });
  const [flags, setFlags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  async function load() {
    if (!session.userId) return;
    const since30 = format(subDays(new Date(), 30), "yyyy-MM-dd");

    const [{ data: logs }, { data: checkups }, { data: pbs }, { data: photoData }] = await Promise.all([
      supabase.from("daily_logs").select("*").eq("client_id", session.userId).order("log_date", { ascending: true }),
      supabase.from("checkups").select("*").eq("client_id", session.userId).order("checkup_date", { ascending: true }),
      supabase.from("personal_bests").select("*").eq("client_id", session.userId).order("pb_date", { ascending: true }),
      supabase.from("progress_photos").select("*").eq("client_id", session.userId).order("taken_date", { ascending: false }),
    ]);

    setWeightData(
      (logs ?? [])
        .filter((l) => l.weight_kg != null)
        .map((l) => ({ date: l.log_date, weight: l.weight_kg }))
    );
    setBodyFatData(
      (checkups ?? [])
        .filter((c) => c.body_fat_pct != null)
        .map((c) => ({ date: c.checkup_date, fat: c.body_fat_pct }))
    );
    const lastCheckup = [...(checkups ?? [])].reverse().find((c) => c.measurements && Object.keys(c.measurements).length > 0);
    setLatestMeasurements(lastCheckup?.measurements ?? null);

    const groups: Record<string, any[]> = {};
    (pbs ?? []).forEach((pb) => {
      groups[pb.exercise] = groups[pb.exercise] || [];
      groups[pb.exercise].push(pb);
    });
    setPbGroups(groups);
    setPhotos(photoData ?? []);
    if (photoData && photoData.length >= 2) {
      setCompareB(photoData[0].id);
      setCompareA(photoData[photoData.length - 1].id);
    }

    // averages over last 30 days
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

    // auto flags
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
      const recent = entries.filter((e) => e.pb_date >= since30);
      if (recent.length >= 1 && entries.length >= 2) {
        const nums = entries.map((e) => parseFloat(e.weight)).filter((n) => !isNaN(n));
        if (nums.length >= 2) {
          const delta = nums[nums.length - 1] - nums[0];
          if (delta > 0) newFlags.push(`↑ ${delta.toFixed(1)} on ${exercise} this period`);
        }
      }
    });
    setFlags(newFlags);
  }

  useEffect(() => {
    load();
  }, [session.userId]); // eslint-disable-line

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session.userId) return;
    setUploading(true);
    const path = `${session.userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("progress-photos").upload(path, file);
    if (uploadError) {
      setUploading(false);
      alert("Couldn't upload photo: " + uploadError.message);
      return;
    }
    const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
    await supabase.from("progress_photos").insert({
      client_id: session.userId,
      photo_url: signed?.signedUrl ?? path,
      taken_date: new Date().toISOString().slice(0, 10),
    });
    setUploading(false);
    load();
  }

  const photoA = photos.find((p) => p.id === compareA);
  const photoB = photos.find((p) => p.id === compareB);

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

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Weight over time</h3>
          {weightData.length === 0 ? (
            <p className="text-sm text-neutral-500">Log your weight in Daily Log to see this chart.</p>
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
            <p className="text-sm text-neutral-500">No body fat % logged yet — your trainer records this at check-ups.</p>
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

      <div className="grid md:grid-cols-3 gap-4">
        <div className="kpi-card">
          <span className="text-neutral-400 text-sm">Avg sleep (30d)</span>
          <span className="text-2xl font-bold">{averages.sleep ? `${averages.sleep.toFixed(1)}h` : "—"}</span>
        </div>
        <div className="kpi-card">
          <span className="text-neutral-400 text-sm">Avg energy (30d)</span>
          <span className="text-2xl font-bold">{averages.energy ? `${averages.energy.toFixed(1)}/5` : "—"}</span>
        </div>
        <div className="kpi-card">
          <span className="text-neutral-400 text-sm">Logging rate (30d)</span>
          <span className="text-2xl font-bold">{averages.logRate}%</span>
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

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><Camera size={16} className="text-gold-300" /> Progress photos</h3>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2">
            <Upload size={14} /> {uploading ? "Uploading…" : "Upload photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
        </div>

        {photos.length === 0 && <p className="text-sm text-neutral-500">No photos yet.</p>}

        {photos.length >= 2 && (
          <div className="mb-4">
            <p className="text-xs text-neutral-500 mb-2">Compare</p>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <select className="input-field text-xs" value={compareA} onChange={(e) => setCompareA(e.target.value)}>
                {photos.map((p) => <option key={p.id} value={p.id}>{p.taken_date}</option>)}
              </select>
              <select className="input-field text-xs" value={compareB} onChange={(e) => setCompareB(e.target.value)}>
                {photos.map((p) => <option key={p.id} value={p.id}>{p.taken_date}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photoA && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoA.photo_url} alt="Before" className="rounded-lg w-full object-cover" style={{ maxHeight: 320 }} />
              )}
              {photoB && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoB.photo_url} alt="After" className="rounded-lg w-full object-cover" style={{ maxHeight: 320 }} />
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={p.id} className="relative">
              <img src={p.photo_url} alt={p.taken_date} className="rounded-lg w-full h-24 object-cover" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 rounded px-1">{p.taken_date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
