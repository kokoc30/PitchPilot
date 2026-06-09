import { useEffect } from "react";
import type { ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { supabase, supabaseConfigError } from "../lib/supabase";
import { router } from "./router";
import { useAppStore } from "./store";

export function AppProviders() {
  return (
    <AuthSessionBootstrap>
      <RouterProvider router={router} />
    </AuthSessionBootstrap>
  );
}

function AuthSessionBootstrap({ children }: { children: ReactNode }) {
  const setSession = useAppStore((state) => state.setSession);
  const setAuthLoading = useAppStore((state) => state.setAuthLoading);
  const setAuthError = useAppStore((state) => state.setAuthError);
  const resetAuth = useAppStore((state) => state.resetAuth);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      resetAuth();
      setAuthError(supabaseConfigError);
      return undefined;
    }

    const client = supabase;
    setAuthLoading(true);

    client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        setSession(null);
        setAuthError("Your saved login expired. Please sign in again.");
      } else {
        setSession(data.session);
        setAuthError(null);
      }

      setAuthLoading(false);
    }).catch(() => {
      if (!mounted) return;
      void client.auth.signOut({ scope: "local" }).catch(() => undefined);
      setSession(null);
      setAuthError("Your saved login expired. Please sign in again.");
      setAuthLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      setAuthError(null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [resetAuth, setAuthError, setAuthLoading, setSession]);

  return children;
}
