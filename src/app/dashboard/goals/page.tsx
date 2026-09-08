"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Download } from "lucide-react";
import { exportGoalsPDF } from "@/lib/pdf";

export default function GoalsPage() {
  const supabase = createClient();
  const session = useSession();
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    if (!session.userId) return;
    supabase
      .from("goals")
      .select("*")
      .eq("client_id", session.userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setGoals(data ?? []));
  }, [session.userId]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-neutral-400 text-sm">Set with your trainer, tracked over time.</p>
        </div>
        <button
          onClick={() => exportGoalsPDF(goals, session.profile?.full_name ?? "Client")}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Download size={14} /> Export PDF
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {goals.length === 0 && <p className="text-sm text-neutral-500">No goals yet — your trainer will add these.</p>}
        {goals.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{g.title}</h3>
              <span
                className={`badge ${
                  g.status === "achieved"
                    ? "bg-green-900/30 text-green-300 border border-green-900"
                    : "badge-gold"
                }`}
              >
                {g.status.replace("_", " ")}
              </span>
            </div>
            {g.description && <p className="text-sm text-neutral-400 mb-3">{g.description}</p>}
            <div className="w-full h-2 bg-base-800 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-gold-500" style={{ width: `${g.progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>{g.progress}% complete</span>
              {g.target_date && <span>Target: {g.target_date}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
