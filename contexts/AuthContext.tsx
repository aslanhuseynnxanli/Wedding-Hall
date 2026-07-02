"use client";

import { supabase } from "@/lib/supabase";
import { CurrentUserProfile } from "@/types/auth";
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  profile: CurrentUserProfile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/me", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id }),
    });

    const data = await res.json();

    if (res.ok) {
      setProfile(data.profile);
    } else {
      setProfile(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMe();
  }, []);

  return (
    <AuthContext.Provider value={{ profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}