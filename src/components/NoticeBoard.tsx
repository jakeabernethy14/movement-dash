"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";
import { toast } from "./ui/Toast";
import { Megaphone, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function NoticeBoard({
  userId,
  canPost,
  isOwner,
}: {
  userId: string;
  canPost: boolean;
  isOwner?: boolean;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [authorRoles, setAuthorRoles] = useState<Record<string, string[]>>({});

  async function load() {
    const { data } = await supabase
      .from("announcements")
      .select("*, author:profiles!announcements_author_id_fkey(full_name, username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(10);
    const list = data ?? [];
    setPosts(list);

    const authorIds = [...new Set(list.map((p: any) => p.author_id))];
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
    return null;
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  async function post() {
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("announcements").insert({ author_id: userId, content: content.trim() });
      if (error) throw error;
      setContent(""); toast("Your studio update has been posted."); await load();
    } catch { toast("Couldn't post your update. Your draft is still here.", "error"); }
    finally { setPosting(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this studio update? This cannot be undone.")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast("Couldn't delete this update. Please try again.", "error"); return; }
    toast("Studio update removed."); load();
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone size={16} className="text-gold-300" />
        <h3 className="font-semibold">News & Notices</h3>
      </div>

      {canPost && (
        <div className="flex gap-2 mb-3">
          <input
            className="input-field"
            aria-label="Studio announcement"
            placeholder="Post an update for everyone…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && post()}
          />
          <button onClick={post} disabled={posting || !content.trim()} className="btn-primary text-sm px-3">
            Post
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {posts.length === 0 && <p className="text-sm text-neutral-500">No announcements yet.</p>}
        {posts.map((p) => (
          <div key={p.id} className="flex gap-2 bg-base-850/60 border border-white/[0.05] rounded-lg p-2.5 text-sm">
            <Avatar url={p.author?.avatar_url} name={p.author?.full_name} size={26} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500">
                  {p.author?.username || p.author?.full_name || "Someone"}
                  {roleLabel(p.author_id) && (
                    <span className="font-semibold" style={{ color: "#4ade80" }}> - {roleLabel(p.author_id)}</span>
                  )}
                  {" · "}
                  {format(new Date(p.created_at), "d MMM, HH:mm")}
                </span>
                {(p.author_id === userId || isOwner) && (
                  <button aria-label="Delete announcement" onClick={() => remove(p.id)} className="text-neutral-600 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="text-neutral-200 mt-0.5">{p.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
