import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppStore } from "../../app/store";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthLoading = useAppStore((state) => state.isAuthLoading);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (isAuthLoading) {
    return (
      <section className="flex min-h-[58vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-md border border-line-2 bg-bg-2 px-5 py-4 text-[13px] text-ink-2">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" aria-hidden="true" />
          Checking your session...
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
