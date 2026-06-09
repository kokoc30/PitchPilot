import { useState } from "react";
import { Check, LogOut, Server, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../app/store";
import type { PracticeMode } from "../../app/store";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getMe } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { getUserDisplayName, titleCase } from "../../lib/utils";

const modes: PracticeMode[] = ["interview", "pitch", "presentation", "class"];

export function SettingsPage() {
  const navigate = useNavigate();
  const activeMode = useAppStore((state) => state.activeMode);
  const setActiveMode = useAppStore((state) => state.setActiveMode);
  const user = useAppStore((state) => state.user);
  const session = useAppStore((state) => state.session);
  const resetAuth = useAppStore((state) => state.resetAuth);
  const [backendResult, setBackendResult] = useState<string>("No backend auth check yet.");
  const [isTestingBackend, setIsTestingBackend] = useState(false);

  const fullName = getUserDisplayName(user);
  const metadataName =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  const sessionStatus = session ? "active" : "missing";

  const testBackendAuth = async () => {
    setIsTestingBackend(true);
    const result = await getMe();
    setIsTestingBackend(false);

    if (result.error) {
      setBackendResult(result.error);
      return;
    }

    setBackendResult(JSON.stringify(result.data, null, 2));
  };

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    resetAuth();
    navigate("/", { replace: true });
  };

  return (
    <section className="mx-auto max-w-[720px] space-y-6">
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300">Settings</p>
        <h1 className="mt-2 text-[32px] font-medium tracking-[-0.022em] text-ink-0">Workspace preferences</h1>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
          <div>
            <h2 className="text-[14px] font-medium text-ink-0">Privacy</h2>
            <p className="mt-1 text-[13px] leading-[1.55] text-ink-2">
              Video stays in your browser. Only the transcript & scores go to the model.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-[14px] font-medium text-ink-0">Signed-in user</h2>
              <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Display name</dt>
                  <dd className="mt-1 text-ink-1">{fullName}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Email</dt>
                  <dd className="mt-1 text-ink-1">{user?.email ?? "Unavailable"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Metadata name</dt>
                  <dd className="mt-1 text-ink-1">{metadataName ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Session</dt>
                  <dd className="mt-1 text-ink-1">
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                        session
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/40 bg-red-500/10 text-red-400",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          session ? "bg-emerald-400" : "bg-red-400",
                        ].join(" ")}
                      />
                      {sessionStatus}
                    </span>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">User id</dt>
                  <dd className="mt-1 break-all font-mono text-[12px] text-ink-1">{user?.id ?? "Unavailable"}</dd>
                </div>
              </dl>
            </div>
          </div>

          <Button
            icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            onClick={handleLogout}
            variant="ghost"
          >
            Logout
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
              <Server className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-[14px] font-medium text-ink-0">Backend auth check</h2>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-3">
                Calls <code className="font-mono text-ink-2">/api/auth/me</code> with the current access token.
              </p>
            </div>
          </div>
          <Button
            disabled={isTestingBackend}
            onClick={testBackendAuth}
            variant="ghost"
          >
            {isTestingBackend ? "Testing..." : "Test backend auth"}
          </Button>
        </div>
        <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-line-2 bg-bg-1 p-3 font-mono text-[11.5px] leading-5 text-ink-1">
          {backendResult}
        </pre>
      </Card>

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="text-[14px] font-medium text-ink-0">Default practice mode</h2>
            <p className="mt-1 text-[12.5px] text-ink-3">Pre-selects this mode on the practice page.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {modes.map((mode) => {
                const selected = mode === activeMode;

                return (
                  <Button
                    icon={selected ? <Check className="h-4 w-4" aria-hidden="true" /> : undefined}
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    size="sm"
                    variant={selected ? "primary" : "ghost"}
                  >
                    {titleCase(mode)}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
