"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AccountType, Profile } from "@/lib/types";

export interface SessionInfo {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  roles: AccountType[];
  isOwner: boolean;
  isTrainer: boolean;
  isClient: boolean;
}

export function useSession(): SessionInfo {
  const supabase = createClient();
  const [state, setState] = useState<SessionInfo>({
    loading: true,
    userId: null,
    profile: null,
    roles: [],
    isOwner: false,
    isTrainer: false,
    isClient: false,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setState((s) => ({ ...s, loading: false }));
        return;
      }

      const [{ data: profile }, { data: types }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("account_types").select("type").eq("profile_id", user.id),
      ]);

      const roles = (types ?? []).map((t) => t.type as AccountType);

      if (mounted) {
        setState({
          loading: false,
          userId: user.id,
          profile: profile ?? null,
          roles,
          isOwner: roles.includes("owner"),
          isTrainer: roles.includes("trainer"),
          isClient: roles.includes("client"),
        });
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line

  return state;
}
