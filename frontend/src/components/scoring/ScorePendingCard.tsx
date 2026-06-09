import { Target } from "lucide-react";

export function ScorePendingCard() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/72 p-6 backdrop-blur-xl md:p-8">
      <div className="flex flex-col items-center justify-center text-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400">
          <Target className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-white">Communication score</h2>
          <p className="mt-1 text-[13px] text-zinc-400">Your final score will appear after you end the session.</p>
        </div>
      </div>
    </section>
  );
}
