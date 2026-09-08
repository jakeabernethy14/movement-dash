"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { Plus, Trash2, Download, Save } from "lucide-react";
import { exportTrainingPlanPDF } from "@/lib/pdf";
import type { TrainingPlanDay } from "@/lib/types";

export default function ProgramsPage() {
  const supabase = createClient();
  const session = useSession();
  const [plans, setPlans] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    if (!session.userId) return;
    const { data } = await supabase
      .from("training_plans")
      .select("*")
      .eq("pt_id", session.userId)
      .order("updated_at", { ascending: false });
    setPlans(data ?? []);
  }

  useEffect(() => {
    load();
  }, [session.userId]); // eslint-disable-line

  function newPlan() {
    setEditing({
      id: null,
      title: "",
      description: "",
      content: [{ day: "Day 1", exercises: [{ name: "", sets: "3", reps: "10" }] }] as TrainingPlanDay[],
    });
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this training plan?")) return;
    await supabase.from("training_plans").delete().eq("id", id);
    load();
  }

  if (editing) {
    return (
      <PlanEditor
        plan={editing}
        ptId={session.userId!}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Training Plans</h1>
          <p className="text-neutral-400 text-sm">Build reusable plans, then assign them from a client's Program tab.</p>
        </div>
        <button onClick={newPlan} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New plan
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {plans.length === 0 && <p className="text-sm text-neutral-500">No training plans yet.</p>}
        {plans.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-neutral-400">{p.description}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportTrainingPlanPDF(p)} className="text-neutral-400 hover:text-gold-400">
                  <Download size={16} />
                </button>
                <button onClick={() => deletePlan(p.id)} className="text-neutral-400 hover:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-2">{p.content?.length ?? 0} day(s) programmed</p>
            <button onClick={() => setEditing(p)} className="btn-secondary text-sm mt-3 w-full">
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanEditor({
  plan,
  ptId,
  onCancel,
  onSaved,
}: {
  plan: any;
  ptId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description);
  const [content, setContent] = useState<TrainingPlanDay[]>(plan.content);

  function addDay() {
    setContent([...content, { day: `Day ${content.length + 1}`, exercises: [] }]);
  }
  function removeDay(i: number) {
    setContent(content.filter((_, idx) => idx !== i));
  }
  function addExercise(dayIdx: number) {
    const copy = [...content];
    copy[dayIdx].exercises.push({ name: "", sets: "3", reps: "10" });
    setContent(copy);
  }
  function updateExercise(dayIdx: number, exIdx: number, field: string, value: string) {
    const copy = [...content];
    (copy[dayIdx].exercises[exIdx] as any)[field] = value;
    setContent(copy);
  }
  function removeExercise(dayIdx: number, exIdx: number) {
    const copy = [...content];
    copy[dayIdx].exercises.splice(exIdx, 1);
    setContent(copy);
  }

  async function save() {
    if (!title.trim()) return alert("Give the plan a title.");
    if (plan.id) {
      await supabase
        .from("training_plans")
        .update({ title, description, content, updated_at: new Date().toISOString() })
        .eq("id", plan.id);
    } else {
      await supabase.from("training_plans").insert({ pt_id: ptId, title, description, content });
    }
    onSaved();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{plan.id ? "Edit plan" : "New plan"}</h1>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={save} className="btn-primary flex items-center gap-2">
            <Save size={16} /> Save plan
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <input
          className="input-field text-lg font-semibold"
          placeholder="Plan title (e.g. Strength Foundations — Phase 1)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Description / goal of this plan"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {content.map((day, dayIdx) => (
          <div key={dayIdx} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <input
                className="input-field w-48 font-medium"
                value={day.day}
                onChange={(e) => {
                  const copy = [...content];
                  copy[dayIdx].day = e.target.value;
                  setContent(copy);
                }}
              />
              <button onClick={() => removeDay(dayIdx)} className="text-neutral-400 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {day.exercises.map((ex, exIdx) => (
                <div key={exIdx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="input-field col-span-4"
                    placeholder="Exercise"
                    value={ex.name}
                    onChange={(e) => updateExercise(dayIdx, exIdx, "name", e.target.value)}
                  />
                  <input
                    className="input-field col-span-2"
                    placeholder="Sets"
                    value={ex.sets}
                    onChange={(e) => updateExercise(dayIdx, exIdx, "sets", e.target.value)}
                  />
                  <input
                    className="input-field col-span-2"
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => updateExercise(dayIdx, exIdx, "reps", e.target.value)}
                  />
                  <input
                    className="input-field col-span-2"
                    placeholder="Weight"
                    value={ex.weight ?? ""}
                    onChange={(e) => updateExercise(dayIdx, exIdx, "weight", e.target.value)}
                  />
                  <button
                    onClick={() => removeExercise(dayIdx, exIdx)}
                    className="col-span-2 text-neutral-500 hover:text-red-400 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addExercise(dayIdx)}
              className="text-sm text-gold-400 hover:underline mt-3 flex items-center gap-1"
            >
              <Plus size={14} /> Add exercise
            </button>
          </div>
        ))}
        <button onClick={addDay} className="btn-secondary w-full flex items-center justify-center gap-2">
          <Plus size={16} /> Add day
        </button>
      </div>
    </div>
  );
}
