import {
  BarChart3,
  Home,
  LogIn,
  LogOut,
  Mic2,
  Settings,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../app/store";
import { supabase } from "../../lib/supabase";
import { getUserDisplayName } from "../../lib/utils";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";

const publicNavItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Login", to: "/login", icon: LogIn },
  { label: "Sign up", to: "/signup", icon: UserPlus },
];

const protectedNavItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Dashboard", to: "/dashboard", icon: BarChart3 },
  { label: "Practice", to: "/practice", icon: Mic2 },
  { label: "Settings", to: "/settings", icon: Settings },
];

function websocketTone(status: string) {
  if (status === "connected") return "online" as const;
  if (status === "connecting") return "pending" as const;
  if (status === "error") return "warning" as const;
  return "offline" as const;
}

export function Navbar() {
  const navigate = useNavigate();
  const websocketStatus = useAppStore((state) => state.websocketStatus);
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const setDemoMode = useAppStore((state) => state.setDemoMode);
  const resetAuth = useAppStore((state) => state.resetAuth);
  const setAuthError = useAppStore((state) => state.setAuthError);
  const navItems = isAuthenticated ? protectedNavItems : publicNavItems;

  const handleLogout = async () => {
    const { error } = supabase ? await supabase.auth.signOut() : { error: null };

    if (error) {
      setAuthError(error.message);
    }

    resetAuth();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-black shadow-[0_0_20px_-4px_rgba(6,182,212,0.6)]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight text-ink-0">
              PitchPilot AI
            </span>
            <span className="block text-xs text-ink-3">Realtime delivery coach</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                [
                  "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  isActive
                    ? "bg-cyan-500/12 text-cyan-200 border border-cyan-400/20"
                    : "text-ink-2 hover:bg-white/[0.08] hover:text-ink-0",
                ].join(" ")
              }
              key={item.to}
              to={item.to}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}

          <div className="flex w-full flex-wrap items-center gap-2 pt-2 sm:w-auto sm:pt-0">
            {isAuthenticated ? (
              <span className="max-w-[14rem] truncate rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-sm text-ink-1">
                {getUserDisplayName(user)}
              </span>
            ) : null}

            <div
              className={[
                "flex items-center gap-2 rounded-full border px-2.5 py-1 transition-colors",
                isDemoMode
                  ? "border-orange-400/40 bg-orange-500/10"
                  : "border-white/10 bg-white/[0.05]",
              ].join(" ")}
            >
              <span
                className={[
                  "select-none font-mono text-[10px] font-semibold uppercase tracking-[0.16em]",
                  isDemoMode ? "text-orange-300" : "text-ink-2",
                ].join(" ")}
                id="demo-mode-label"
              >
                Demo Mode
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isDemoMode}
                aria-labelledby="demo-mode-label"
                aria-label={`Demo mode ${isDemoMode ? "on" : "off"}`}
                title={isDemoMode ? "Disable demo mode" : "Enable demo mode"}
                onClick={() => setDemoMode(!isDemoMode)}
                className={[
                  "toggle",
                  isDemoMode ? "amber on" : "",
                ].join(" ")}
              >
                <span className="sr-only">
                  {isDemoMode ? "Disable demo mode" : "Enable demo mode"}
                </span>
              </button>
            </div>

            <StatusBadge
              label={`WS ${websocketStatus}`}
              tone={websocketTone(websocketStatus)}
            />

            {isAuthenticated ? (
              <Button
                icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
                onClick={handleLogout}
                size="sm"
                variant="ghost"
              >
                Logout
              </Button>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}
