"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { Lock, Users, Trash2 } from "lucide-react";
import Avatar from "./Avatar";
import { toast } from "./ui/Toast";

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
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<"shared" | "pt_only">("shared");
  const [loading, setLoading] = useState(true);
  const [authorRoles, setAuthorRoles] = useState<Record<string, string[]>>({});

  async function load() {
    const { data } = await supabase
      .from("notes")
      .select("*, author:profiles!notes_author_id_fkey(full_name, username, avatar_url)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    const list = (data as any) ?? [];
    setNotes(list);
    setLoading(false);

    const authorIds = [...new Set(list.map((n: any) => n.author_id))];
    if (authorIds.length > 0) {
      const { data: types } = await supabase
        .from("account_types")
        .select("profile_id, type")
        .in("profile_id", authorIds as string[]);
      const map: Record<string, string[]> = {};
      (types ?? []).forEach((t: any) => {
        map[t.profile_id] = map[t.profile_id] || [];
        map[t.profile_id].push(t.type);
      });
      setAuthorRoles(map);
    }
  }

  function roleLabel(id: string) {
    const roles = authorRoles[id] ?? [];
    if (roles.includes("owner")) return "Owner";
    if (roles.includes("trainer")) return "Trainer";
    if (roles.includes("client")) return "Client";
    return null;
  }

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line

  async function addNote() {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("notes").insert({ author_id: authorId, client_id: clientId, pt_id: ptId, content: content.trim(), visibility: isSelfNote ? "pt_only" : canChooseVisibility ? visibility : "shared" });
      if (error) throw error;
      setContent(""); toast("Note saved."); await load();
    } catch { toast("Couldn't save your note. Your draft is still here.", "error"); }
    finally { setSaving(false); }
  }
  async function deleteNote(id: string) {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id).eq("author_id", authorId);
    if (error) { toast("Couldn't delete this note. Please try again.", "error"); return; }
    toast("Note deleted."); load();
  }

  return (
    <div className="card p-4 flex flex-col">
      <h3 className="font-semibold mb-3">Notes</h3>
      <div className="overflow-y-auto space-y-2 mb-3 max-h-64">
        {loading && <p className="text-sm text-neutral-500">Loading…</p>}
        {!loading && notes.length === 0 && (
          <p className="text-sm text-neutral-500">No notes yet.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="bg-base-850 border border-base-border rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                <Avatar url={n.author?.avatar_url} name={n.author?.full_name} size={16} />
                {n.author?.username || n.author?.full_name || "Someone"}
                {roleLabel(n.author_id) && (
                  <span className="font-semibold" style={{ color: "#4ade80" }}>
                    - {roleLabel(n.author_id)}
                  </span>
                )}
                <span>· {new Date(n.created_at).toLocaleString()}</span>
              </span>
              <div className="flex items-center gap-2">
                {n.visibility === "pt_only" && (
                  <span className="badge bg-base-700 text-neutral-400 gap-1">
                    <Lock size={10} /> PT only
                  </span>
                )}
                {n.author_id === authorId && (
                  <button aria-label="Delete note" onClick={() => deleteNote(n.id)} className="text-neutral-600 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-neutral-200 whitespace-pre-wrap">{n.content}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <textarea
          className="input-field resize-none"
          rows={2}
          aria-label="Note content"
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
          <button disabled={saving || !content.trim()} onClick={addNote} className="btn-primary text-sm px-3 py-1.5">
            {saving ? "Saving..." : "Add note"}
          </button>
        </div>
      </div>
    </div>
  );
}
