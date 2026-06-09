import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../../app/store";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { supabase, supabaseConfigError } from "../../lib/supabase";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAppStore((state) => state.setSession);
  const setAuthError = useAppStore((state) => state.setAuthError);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isAuthLoading = useAppStore((state) => state.isAuthLoading);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(supabaseConfigError);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  const validate = () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      return "All fields are required.";
    }

    if (!emailPattern.test(email.trim())) {
      return "Enter a valid email address.";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      const message = supabaseConfigError ?? "Supabase Auth is not configured.";
      setLocalError(message);
      setAuthError(message);
      return;
    }

    const validationError = validate();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);
    setSuccessMessage(null);
    setAuthError(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setLocalError(error.message);
      setAuthError(error.message);
      return;
    }

    if (data.session) {
      setSession(data.session);
      navigate("/dashboard", { replace: true });
      return;
    }

    setSuccessMessage("Account created. Check your email to confirm your address, then log in.");
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
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300">Signup</p>
          <h1 className="mt-2 text-[28px] font-medium tracking-[-0.022em] text-ink-0">Create a workspace</h1>
          <p className="mt-2 text-[13px] leading-[1.55] text-ink-2">
            Email and password. That's it.
          </p>
        </div>

        {localError ? (
          <div className="mb-5 flex gap-3 rounded-md border border-red-500/30 bg-red-500/[0.06] p-3 text-[13px] leading-[1.55] text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>{localError}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-5 flex gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-[13px] leading-[1.55] text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-[13px] font-medium text-ink-1">Full name</span>
            <input
              className="mt-2 h-11 w-full rounded-[8px] border border-line-2 bg-bg-3 px-3 text-[13.5px] text-ink-0 outline-none transition placeholder:text-ink-3 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              disabled={isSubmitting}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Alex Founder"
              required
              type="text"
              value={fullName}
            />
          </label>
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
          <label className="block">
            <span className="text-[13px] font-medium text-ink-1">Confirm password</span>
            <input
              className="mt-2 h-11 w-full rounded-[8px] border border-line-2 bg-bg-3 px-3 text-[13.5px] text-ink-0 outline-none transition placeholder:text-ink-3 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              disabled={isSubmitting}
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat password"
              required
              type="password"
              value={confirmPassword}
            />
          </label>
          <Button
            className="w-full"
            disabled={isSubmitting || !supabase}
            icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-ink-2">
          Already have an account?{" "}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" to="/login">
            Log in
          </Link>
        </p>
      </Card>
      </motion.div>
    </section>
  );
}
