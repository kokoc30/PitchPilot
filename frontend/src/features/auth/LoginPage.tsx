import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, LogIn } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "../../app/store";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { supabase, supabaseConfigError } from "../../lib/supabase";

function redirectPathFromState(state: unknown) {
  if (state && typeof state === "object" && "from" in state) {
    const from = (state as { from?: { pathname?: string } }).from;
    return from?.pathname ?? "/dashboard";
  }

  return "/dashboard";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAppStore((state) => state.setSession);
  const setAuthError = useAppStore((state) => state.setAuthError);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isAuthLoading = useAppStore((state) => state.isAuthLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(supabaseConfigError);
  const redirectTo = redirectPathFromState(location.state);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate, redirectTo]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      const message = supabaseConfigError ?? "Supabase Auth is not configured.";
      setLocalError(message);
      setAuthError(message);
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setLocalError(error.message);
      setAuthError(error.message);
      return;
    }

    if (data.session) {
      setSession(data.session);
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <section className="mx-auto flex min-h-[62vh] max-w-xl items-center">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.3 }}
      >
      <Card className="w-full">
        <div className="mb-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300">Login</p>
          <h1 className="mt-2 text-[28px] font-medium tracking-[-0.022em] text-ink-0">Welcome back</h1>
          <p className="mt-2 text-[13px] leading-[1.55] text-ink-2">
            Continue to your realtime coaching workspace.
          </p>
        </div>

        {localError ? (
          <div className="mb-5 flex gap-3 rounded-md border border-red-500/30 bg-red-500/[0.06] p-3 text-[13px] leading-[1.55] text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>{localError}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-[13px] font-medium text-ink-1">Email</span>
            <input
              className="mt-2 h-11 w-full rounded-[8px] border border-line-2 bg-bg-3 px-3 text-[13.5px] text-ink-0 outline-none transition placeholder:text-ink-3 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              disabled={isSubmitting}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-ink-1">Password</span>
            <input
              className="mt-2 h-11 w-full rounded-[8px] border border-line-2 bg-bg-3 px-3 text-[13.5px] text-ink-0 outline-none transition placeholder:text-ink-3 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              disabled={isSubmitting}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </label>
          <Button
            className="w-full"
            disabled={isSubmitting || !supabase}
            icon={<LogIn className="h-4 w-4" aria-hidden="true" />}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Continue"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-ink-2">
          New to PitchPilot?{" "}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" to="/signup">
            Create an account
          </Link>
        </p>
      </Card>
      </motion.div>
    </section>
  );
}
