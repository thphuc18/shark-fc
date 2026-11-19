"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import type { Profile } from "@/lib/types";

interface SignUpInput {
  fullName: string;
  displayName: string;
  jersey: number | null;
  email: string;
  password: string;
}

interface AuthCtx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: SignUpInput) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  profile: null,
  loading: true,
  configured: false,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Theo dõi phiên đăng nhập
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
      })
      .catch(() => {
        // Lỗi mạng khi đọc phiên — giữ session null, để onAuthStateChange xử lý
      })
      .finally(() => {
        // Chỉ kết thúc "đang kiểm tra phiên" SAU khi đã biết có session hay không
        setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Nạp hồ sơ thành viên khi có phiên
  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null);
      // Không setLoading(false) ở đây — để effect getSession() quyết định
      // (tránh "đá" user đã đăng nhập ra /login khi mạng chậm)
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        setProfile((data as Profile) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, supabase]);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, [supabase, session]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return "Chưa cấu hình Supabase. Hãy kiểm tra .env.local";
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? friendlyError(error) : null;
    },
    [supabase]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      if (!supabase) return "Chưa cấu hình Supabase. Hãy kiểm tra .env.local";
      const { error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            username: input.email.trim().split("@")[0],
            display_name: input.displayName.trim() || null,
            jersey_number: input.jersey,
          },
        },
      });
      return error ? friendlyError(error) : null;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  return (
    <Ctx.Provider
      value={{
        session,
        profile,
        loading,
        configured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

