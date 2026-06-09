import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function AppLayout() {
  return (
    <div className="app-page-bg min-h-screen text-ink-0">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-ink-3">
        PitchPilot AI · Realtime delivery coach
      </footer>
    </div>
  );
}
