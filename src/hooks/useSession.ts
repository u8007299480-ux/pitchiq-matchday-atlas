import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Client-side session (null while loading or signed out). */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

export async function signInWithGoogle(returnTo = "/app") {
  const { lovable } = await import("@/integrations/lovable/index");
  sessionStorage.setItem("pitchiq_return", returnTo.startsWith("/") ? returnTo : "/app");
  return lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
}
