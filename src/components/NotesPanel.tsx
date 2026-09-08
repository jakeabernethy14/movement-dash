"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { Lock, Users } from "lucide-react";

interface Props {
  clientId: string;
  ptId: string;
  authorId: string;
  canChooseVisibility?: boolean; // true for PT viewing a client
  isSelfNote?: boolean; // true when a PT/owner is viewing their own personal notes
}

export default function NotesPanel({ clientId, ptId, authorId, canChooseVisibility, isSelfNote }: Props) {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"shared" | "pt_only">("shared");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("notes")
      .select("*, author:profiles!notes_author_id_fkey(full_name, username)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setNotes((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line

  async function addNote() {
    if (!content.trim()) return;
    const { error } = await supabase.from("notes").insert({
      author_id: authorId,
      client_id: clientId,
      pt_id: ptId,
      content: content.trim(),
      visibility: canChooseVisibility ? visibility : "shared",
    });
    if (!error) {
      setContent("");
      load();
    }
  }

  return (
    <div className="card p-4 flex flex-col h-full">
      <h3 className="font-semibold mb-3">Notes</h3>
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-64">
        {loading && <p className="text-sm text-neutral-500">Loading…</p>}
        {!loading && notes.length === 0 && (
          <p className="text-sm text-neutral-500">No notes yet.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="bg-base-850 border border-base-border rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-500">
                {n.author?.username || n.author?.full_name || "Someone"} ·{" "}
                {new Date(n.created_at).toLocaleString()}
              </span>
              {n.visibility === "pt_only" && (
                <span className="badge bg-base-700 text-neutral-400 gap-1">
                  <Lock size={10} /> PT only
                </span>
              )}
            </div>
            <p className="text-neutral-200 whitespace-pre-wrap">{n.content}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Write a note…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center justify-between">
          {canChooseVisibility ? (
            <select
              className="input-field w-auto text-xs py-1"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "shared" | "pt_only")}
            >
              <option value="shared">Visible to client</option>
              <option value="pt_only">PT only</option>
            </select>
          ) : isSelfNote ? (
            <span className="text-xs text-neutral-500">Personal note</span>
          ) : (
            <span className="text-xs text-neutral-500 flex items-center gap-1">
              <Users size={12} /> Visible to your PT
            </span>
          )}
          <button onClick={addNote} className="btn-primary text-sm px-3 py-1.5">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
