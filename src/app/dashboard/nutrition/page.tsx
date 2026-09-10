"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Salad, Flame, Beef, Wheat, Droplet } from "lucide-react";

export default function ClientNutritionPage() {
  const supabase = createClient();
  const session = useSession();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.userId) return;
    supabase
      .from("nutrition_info")
      .select("*")
      .eq("client_id", session.userId)
      .maybeSingle()
      .then(({ data }) => {
        setPlan(data);
        setLoading(false);
      });
  }, [session.userId]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nutrition Plan</h1>
        <p className="text-neutral-400 text-sm">Targets set by your trainer.</p>
      </div>

      {loading && <p className="text-neutral-500">Loading…</p>}

      {!loading && !plan && (
        <div className="card p-6 text-center">
          <Salad size={28} className="text-gold-300 mx-auto mb-2" />
          <p className="text-neutral-400 text-sm">
            Your trainer hasn't set a nutrition plan for you yet.
          </p>
        </div>
      )}

      {plan && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kpi-card">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-sm">Calories</span>
                <Flame size={18} className="text-gold-300" />
              </div>
              <span className="text-2xl font-bold">{plan.calories_target ?? "—"}</span>
            </div>
            <div className="kpi-card">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-sm">Protein</span>
                <Beef size={18} className="text-gold-300" />
              </div>
              <span className="text-2xl font-bold">{plan.protein_target ?? "—"}<span className="text-sm text-neutral-500">g</span></span>
            </div>
            <div className="kpi-card">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-sm">Carbs</span>
                <Wheat size={18} className="text-gold-300" />
              </div>
              <span className="text-2xl font-bold">{plan.carbs_target ?? "—"}<span className="text-sm text-neutral-500">g</span></span>
            </div>
            <div className="kpi-card">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-sm">Fats</span>
                <Droplet size={18} className="text-gold-300" />
              </div>
              <span className="text-2xl font-bold">{plan.fats_target ?? "—"}<span className="text-sm text-neutral-500">g</span></span>
            </div>
          </div>

          {plan.notes && (
            <div className="card p-4">
              <h3 className="font-semibold mb-2">Notes from your trainer</h3>
              <p className="text-neutral-300 text-sm whitespace-pre-wrap">{plan.notes}</p>
            </div>
          )}

          <p className="text-xs text-neutral-500">
            Last updated {new Date(plan.updated_at).toLocaleDateString()}. Log how you're tracking against this in your{" "}
            <a href="/dashboard/dailylog" className="text-gold-300 hover:underline">Daily Log</a>.
          </p>
        </>
      )}
    </div>
  );
}
