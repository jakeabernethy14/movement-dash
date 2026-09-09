"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";
import { Megaphone, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function NoticeBoard({
  userId,
  canPost,
}: {
  userId: string;
  canPost: boolean;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("announcements")
      .select("*, author:profiles!announcements_author_id_fkey(full_name, username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(10);
    setPosts(data ?? []);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  async function post() {
    if (!content.trim()) return;
    setPosting(true);
    await supabase.from("announcements").insert({ author_id: userId, content: content.trim() });
    setContent("");
    setPosting(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from("announcements").delete().eq("id", id);
    load();
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
                  {p.author?.username || p.author?.full_name || "Someone"} ·{" "}
                  {format(new Date(p.created_at), "d MMM, HH:mm")}
                </span>
                {(p.author_id === userId) && (
                  <button onClick={() => remove(p.id)} className="text-neutral-600 hover:text-red-400">
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
