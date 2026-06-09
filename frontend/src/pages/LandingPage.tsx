import {
  Activity,
  ArrowRight,
  Camera,
  Clock,
  LineChart,
  List,
  MessageSquare,
  Mic2,
  Play,
  RotateCw,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../app/store";
import { Button } from "../components/ui/Button";

/* ============================================================
   Reusable bits
============================================================ */

function Eyebrow({ num, children }: { num: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
      <span className="text-cyan-300">{num}</span>
      <span className="h-px w-8 bg-line-2" />
      {children}
    </span>
  );
}

function SectionHead({
  num,
  eyebrow,
  title,
  subtitle,
  meta,
}: {
  num: string;
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  meta?: string;
}) {
  return (
    <header className="mb-12 flex flex-col gap-6 lg:mb-16 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <Eyebrow num={num}>{eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[32px] font-medium leading-[1.15] tracking-[-0.022em] text-ink-0 sm:text-[42px] sm:leading-[1.1]">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-[1.6] text-ink-2 sm:text-[17px]">
          {subtitle}
        </p>
      </div>
      {meta ? (
        <p className="max-w-xs text-[13px] leading-[1.5] text-ink-3">{meta}</p>
      ) : null}
    </header>
  );
}

function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={[
        "border-t border-line-1 px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20 xl:px-16 xl:py-24",
        className,
      ].join(" ")}
    >
      <div className="mx-auto w-full max-w-[1320px]">{children}</div>
    </section>
  );
}

/* ============================================================
   Hero — Practice workspace mockup
============================================================ */

function PracticeMockup() {
  return (
    <div
      className="overflow-hidden rounded-[14px] border border-line-2 bg-bg-2"
      style={{ boxShadow: "var(--shadow-pop)" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-3 border-b border-line-2 bg-bg-1 p-3.5 lg:border-b-0 lg:border-r">
          {/* Webcam preview */}
          <div
            className="relative aspect-[16/10] overflow-hidden rounded-md border border-line-2"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 30%, rgba(6,182,212,0.10), transparent 60%), linear-gradient(180deg, #141414 0%, #000000 100%)",
            }}
          >
            {/* Silhouette */}
            <div
              className="absolute inset-x-[18%] bottom-0 top-[18%]"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 30%, rgba(28,28,28,0.95), rgba(0,0,0,0) 70%)",
              }}
            />
            {/* Face detection box */}
            <div
              className="absolute left-1/2 top-[28%] h-[44%] w-[42%] -translate-x-1/2 rounded-[6px]"
              style={{
                border: "1px solid rgba(6,182,212,0.55)",
                boxShadow: "0 0 24px -2px rgba(6,182,212,0.45)",
              }}
            >
              {/* Corner brackets */}
              {(["tl", "tr", "bl", "br"] as const).map((c) => (
                <span
                  key={c}
                  className="absolute h-3 w-3 border-cyan-300"
                  style={{
                    borderTopWidth: c.startsWith("t") ? 2 : 0,
                    borderBottomWidth: c.startsWith("b") ? 2 : 0,
                    borderLeftWidth: c.endsWith("l") ? 2 : 0,
                    borderRightWidth: c.endsWith("r") ? 2 : 0,
                    top: c.startsWith("t") ? -1 : "auto",
                    bottom: c.startsWith("b") ? -1 : "auto",
                    left: c.endsWith("l") ? -1 : "auto",
                    right: c.endsWith("r") ? -1 : "auto",
                  }}
                />
              ))}
              {/* Keypoints */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <line x1="32" y1="42" x2="68" y2="42" stroke="#22D3EE" strokeWidth="0.6" />
                <line x1="40" y1="70" x2="60" y2="70" stroke="#22D3EE" strokeWidth="0.6" />
                {[
                  [32, 42],
                  [68, 42],
                  [50, 55],
                  [40, 70],
                  [60, 70],
                  [50, 78],
                ].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="1.4" fill="#22D3EE" />
                ))}
              </svg>
            </div>

            {/* Top overlays */}
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-red-400 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                REC · 00:42
              </span>
            </div>
            <div className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                FACE · LOCKED
              </span>
            </div>

            {/* Bottom mic meter */}
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
              <div className="flex h-5 items-center gap-1 rounded-full bg-black/55 px-2.5 backdrop-blur">
                {[3, 5, 8, 11, 9, 6, 4, 2].map((h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-sm bg-cyan-400"
                    style={{ height: `${h}px`, opacity: 0.5 + i * 0.05 }}
                  />
                ))}
              </div>
              <span className="rounded-full bg-black/55 px-2 py-1 font-mono text-[10px] font-semibold text-ink-1 backdrop-blur">
                −18 dB
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-3 py-2">
            <button
              type="button"
              aria-label="Record"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_4px_12px_-4px_rgba(239,68,68,0.55)]"
            >
              <span className="h-2 w-2 rounded-full bg-white" />
            </button>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
              <Mic2 className="h-3.5 w-3.5" />
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
              <Video className="h-3.5 w-3.5" />
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-3 text-ink-2">
              <Play className="h-3.5 w-3.5" />
            </span>
            <span className="ml-auto font-mono text-[12px] font-medium text-ink-1 tabular-nums">
              00:42
            </span>
          </div>

          {/* Mini metric grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "WPM", value: "147" },
              { label: "FILLERS", value: "2.3%" },
              { label: "FACING", value: "88%" },
              { label: "PAUSES", value: "4" },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-md border border-line-2 bg-bg-2 px-3 py-2"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  {m.label}
                </div>
                <div className="mt-0.5 font-mono text-[18px] font-medium text-ink-0 tabular-nums">
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3 bg-bg-2 p-3.5">
          {/* Live transcript */}
          <div className="rounded-md border border-line-2 bg-bg-1 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                Live transcript
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                LIVE
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-[1.55] text-ink-1">
              We're building a platform that helps founders{" "}
              <span
                className="rounded-[3px] px-1 text-amber-400"
                style={{
                  backgroundColor: "rgba(249,115,22,0.18)",
                  borderBottom: "1px dashed #F97316",
                }}
              >
                um
              </span>{" "}
              rehearse their pitch <span className="italic text-ink-3">[0.8s]</span>{" "}
              with measurable feedback
              <span className="ml-0.5 animate-pulse font-mono text-cyan-300">▍</span>
            </p>
          </div>

          {/* Score card */}
          <div className="flex items-center gap-3 rounded-md border border-line-2 bg-bg-1 p-3">
            <ScoreRing value={92} />
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                Delivery · Live
              </div>
              <div className="mt-1 text-[13px] text-ink-1">
                Calm, on-pace. 2 fillers / min.
              </div>
            </div>
          </div>

          {/* Retry comparison */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md border border-line-2 bg-bg-1 p-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                RUN 01
              </div>
              <div className="font-mono text-[20px] font-medium text-ink-1 tabular-nums">
                82
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-bg-3">
                <div className="h-full rounded-full bg-ink-3" style={{ width: "82%" }} />
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-cyan-400" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400">
                RUN 02 · +10
              </div>
              <div className="font-mono text-[20px] font-medium text-emerald-400 tabular-nums">
                92
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-bg-3">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: "92%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="#06B6D4"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-[16px] font-medium text-ink-0 tabular-nums">
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   Sections
============================================================ */

function Hero({ onPrimary }: { onPrimary: () => void }) {
  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-white/10 px-4 pb-12 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pb-20 lg:pt-20 xl:px-16"
      style={{
        background:
          "radial-gradient(820px 420px at 82% -10%, rgba(6,182,212,0.16), transparent 58%)," +
          "radial-gradient(680px 420px at 6% 90%, rgba(249,115,22,0.10), transparent 60%)," +
          "#000000",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 30%, black, transparent 75%)",
          maskImage:
            "radial-gradient(circle at 50% 30%, black, transparent 75%)",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(6,182,212,0.6)]" />
            Real-time practice coach
          </span>
          <h1 className="mt-5 text-[42px] font-semibold leading-[1.04] tracking-[-0.025em] text-white sm:text-[56px] lg:text-[64px] lg:leading-[1.02]">
            Practice{" "}
            <span
              style={{
                background:
                  "linear-gradient(115deg, #22d3ee 0%, #06b6d4 45%, #f97316 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              before
            </span>{" "}
            the real moment.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-[1.6] text-white/70">
            Live transcript, delivery signals, scores, and an AI coaching draft in
            one workspace.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                variant="cta"
                onClick={onPrimary}
                icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Start practicing
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                variant="ghost"
                icon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Watch demo
              </Button>
            </motion.div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
            <span>
              <span className="text-white/70">Browser-side</span> · CAPTURE
            </span>
            <span>
              <span className="text-white/70">Deterministic</span> · SCORING
            </span>
            <span>
              <span className="text-white/70">No upload</span> · DATA
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        >
          <PracticeMockup />
        </motion.div>
      </div>
    </section>
  );
}

const PROBLEMS: { num: string; title: string; helper: string }[] = [
  {
    num: "01",
    title: "Pace drifts under stress.",
    helper: "You can't feel WPM. You can read it.",
  },
  {
    num: "02",
    title: "Filler words slip in invisibly.",
    helper: "Most people undercount their own.",
  },
  {
    num: "03",
    title: "Eyes leave the camera.",
    helper:
      "Camera-facing is an honest enough signal to coach against.",
  },
  {
    num: "04",
    title: "Retries blur together.",
    helper: "You need a delta, not a feeling.",
  },
  {
    num: "05",
    title: "Posture isn't in your script.",
    helper:
      "Delivery shows up on camera. We turn it into a signal.",
  },
  {
    num: "06",
    title: "Chat-only AI can't watch.",
    helper:
      "A model that only reads can't coach delivery.",
  },
];

function ProblemSection() {
  return (
    <Section>
      <SectionHead
        num="01"
        eyebrow="The problem"
        title={
          <>
            You can't improve what you don't{" "}
            <span className="font-serif italic text-cyan-300">measure</span>.
          </>
        }
        subtitle="Most rehearsal happens without numbers. PitchPilot gives you the numbers."
      />
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-3">
        {PROBLEMS.map((p) => (
          <div key={p.num} className="bg-bg-2 p-6">
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300">
              {p.num}
            </div>
            <div className="mt-3 h-px w-8 bg-line-3" />
            <h3 className="mt-4 text-[16px] font-medium text-ink-0">{p.title}</h3>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-2">
              {p.helper}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

const FEATURES: { num: string; icon: LucideIcon; title: string; helper: string }[] = [
  { num: "01", icon: MessageSquare, title: "Live transcript", helper: "Streaming, timestamped, scrollable." },
  { num: "02", icon: List, title: "Filler detection", helper: "Counted, rated, highlighted in replay." },
  { num: "03", icon: Activity, title: "Speaking pace", helper: "Rolling WPM with a target band." },
  { num: "04", icon: Clock, title: "Pause detection", helper: "Long silences marked so you can plan them." },
  { num: "05", icon: Video, title: "Camera-facing estimate", helper: "A practice estimate — not an eye-tracker." },
  { num: "06", icon: UserCheck, title: "Posture & delivery", helper: "A single calm-to-restless signal over time." },
  { num: "07", icon: TrendingUp, title: "Deterministic score", helper: "Formula on the page. No black box." },
  { num: "08", icon: Sparkles, title: "AI coaching draft", helper: "Strengths, focus areas, rewritten answer." },
  { num: "09", icon: RotateCw, title: "Retry comparison", helper: "Side-by-side numbers across runs." },
  { num: "10", icon: LineChart, title: "Saved analytics", helper: "Trends across every session you keep." },
  { num: "11", icon: Play, title: "Demo mode", helper: "Sample data, clearly labeled." },
  { num: "12", icon: Shield, title: "Privacy by default", helper: "Video stays in the browser." },
];

function FeatureGrid() {
  return (
    <Section>
      <SectionHead
        num="02"
        eyebrow="What it measures"
        title="Eleven signals. One honest picture."
        subtitle="Capture is browser-side. Only the transcript is sent to the model."
      />
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.num} className="flex flex-col gap-3 bg-bg-2 p-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                <f.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                {f.num}
              </span>
            </div>
            <div>
              <h3 className="text-[14.5px] font-medium text-ink-0">{f.title}</h3>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-2">
                {f.helper}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const STEPS = [
  { n: "1", title: "Choose mode", helper: "Interview, pitch, class, elevator, free-form." },
  { n: "2", title: "Allow cam & mic", helper: "One prompt. No upload." },
  { n: "3", title: "Practice live", helper: "Signals update as you speak." },
  { n: "4", title: "Review report", helper: "Score · strengths · rewrite." },
  { n: "5", title: "Retry & compare", helper: "See the delta side-by-side." },
];

function HowItWorks() {
  return (
    <Section>
      <SectionHead
        num="03"
        eyebrow="How it works"
        title={
          <>
            From cold start to draft in{" "}
            <span className="font-serif italic text-cyan-300">under a minute</span>.
          </>
        }
        subtitle="Open the page. Allow camera and mic once. Talk."
      />
      <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-[28px] hidden h-px lg:block"
          style={{
            background:
              "repeating-linear-gradient(to right, rgba(6,182,212,0.35) 0 8px, transparent 8px 16px)",
          }}
        />
        {STEPS.map((s) => (
          <div key={s.n} className="relative">
            <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-500/35 bg-cyan-500/10 text-cyan-300">
              <span className="font-mono text-[18px] font-medium">{s.n}</span>
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 font-mono text-[10px] font-semibold text-white">
                {s.n}
              </span>
            </div>
            <h3 className="mt-4 text-[15px] font-medium text-ink-0">{s.title}</h3>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-2">{s.helper}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

const USE_CASES = [
  { title: "Interview prep", helper: "STAR-format rewrites.", tag: "INTERVIEW" },
  { title: "Startup pitch", helper: "Cold-open scoring · time discipline.", tag: "PITCH" },
  { title: "Class talks", helper: "Slide pacing & Q&A rehearsal.", tag: "CLASS" },
  { title: "Public speaking", helper: "Long-form pacing & breath.", tag: "KEYNOTE" },
  { title: "Demo day", helper: "60–120s focus · hard cut.", tag: "DEMO DAY" },
];

function UseCases() {
  return (
    <Section>
      <SectionHead
        num="04"
        eyebrow="Use cases"
        title="Five modes. One workspace."
        subtitle="Modes tune prompts, weights, and report focus. Signals stay the same."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {USE_CASES.map((u) => (
          <div
            key={u.tag}
            className="flex flex-col gap-3 rounded-md border border-line-2 bg-bg-2 p-5 transition-colors hover:border-line-3"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-bg-3 text-ink-1">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="text-[14.5px] font-medium text-ink-0">{u.title}</h3>
            <p className="text-[12.5px] leading-[1.5] text-ink-2">{u.helper}</p>
            <span className="mt-auto font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-300">
              → {u.tag}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ProofSection() {
  const metrics = [
    { label: "PACE", value: "147", unit: "wpm", caption: "in target band", tone: "success" },
    { label: "FILLERS", value: "2.3", unit: "%", caption: "14 / 1,082 words", tone: "amber" },
    { label: "FACING", value: "88", unit: "%", caption: "4 look-aways", tone: "success" },
    { label: "SCORE", value: "92", unit: "/100", caption: "top quartile", tone: "cyan" },
    { label: "DELTA", value: "+10", unit: "", caption: "run 02 vs 01", tone: "success" },
  ] as const;

  const toneText: Record<string, string> = {
    success: "text-emerald-400",
    amber: "text-amber-400",
    cyan: "text-cyan-300",
  };
  const toneDot: Record<string, string> = {
    success: "bg-emerald-400",
    amber: "bg-amber-400",
    cyan: "bg-cyan-400",
  };

  return (
    <Section>
      <SectionHead
        num="05"
        eyebrow="Proof"
        title="What one run looks like on the page."
        subtitle="Sample demo metrics — not a guarantee."
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Sample demo metrics
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          Session #482 · pitch mode
        </span>
      </div>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col gap-3 bg-bg-2 p-5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
              {m.label}
            </span>
            <div>
              <span
                className={[
                  "font-mono text-[36px] font-medium leading-none tabular-nums",
                  m.label === "SCORE" ? "text-cyan-300" : "text-ink-0",
                  m.label === "DELTA" ? "text-emerald-400" : "",
                ].join(" ")}
              >
                {m.value}
              </span>
              <span className="ml-1 font-mono text-[13px] text-ink-3">{m.unit}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
              <span className={["h-1.5 w-1.5 rounded-full", toneDot[m.tone]].join(" ")} />
              <span className={toneText[m.tone]}>{m.caption}</span>
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
   AI Report preview (full two-column section)
============================================================ */

function AIReportPreview() {
  const meta = [
    ["Mode", "Pitch"],
    ["Prompt", "Why now"],
    ["Duration", "02:38"],
    ["Words", "1,082"],
    ["Run", "02"],
    ["Score", "92"],
  ];
  const heatmap = [
    { label: "PACE", value: 78, color: "#22D3EE" },
    { label: "FILLERS", value: 62, color: "#F97316" },
    { label: "FACING", value: 88, color: "#10B981" },
    { label: "POSTURE", value: 71, color: "#22D3EE" },
    { label: "CLARITY", value: 92, color: "#22D3EE" },
  ];

  return (
    <Section>
      <SectionHead
        num="06"
        eyebrow="AI coaching draft"
        title={
          <>
            A draft you can{" "}
            <span className="font-serif italic text-cyan-300">argue with</span>.
          </>
        }
        subtitle="The model only sees the transcript and deterministic signals."
      />
      <div
        className="overflow-hidden rounded-lg border border-line-2 bg-bg-2"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="flex flex-col gap-5 border-b border-line-2 bg-bg-1 p-5 lg:border-b-0 lg:border-r">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              AI coaching draft
            </span>

            <dl className="grid grid-cols-2 gap-y-2 text-[12px]">
              {meta.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                    {k}
                  </dt>
                  <dd className="text-right font-mono text-[12px] text-ink-1 tabular-nums">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>

            <div>
              <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
                Signal heatmap
              </div>
              <div className="flex flex-col gap-2">
                {heatmap.map((h) => (
                  <div key={h.label} className="grid grid-cols-[60px_1fr_28px] items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-2">
                      {h.label}
                    </span>
                    <span className="h-1.5 rounded-full bg-bg-3">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${h.value}%`, background: h.color }}
                      />
                    </span>
                    <span className="text-right font-mono text-[11px] text-ink-1 tabular-nums">
                      {h.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Body */}
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <div>
              <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
                Summary
              </div>
              <p className="text-[15.5px] leading-[1.6] text-ink-1">
                Calm, on-pace, structurally clear. Opening landed the problem in one
                sentence — the strongest moment in the run. The{" "}
                <span className="font-serif italic text-cyan-300">weakest</span>{" "}
                stretch was "why now," where pace climbed past 170 wpm. Tighten that
                transition and this is a quarterly best.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-300">
                  Strengths
                </div>
                <ul className="flex flex-col gap-2 text-[13px] text-ink-1">
                  {[
                    "Clear thesis in sentence one.",
                    "Pace steady across the first two minutes.",
                    "Two well-placed pauses at the market beat.",
                  ].map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-amber-400">
                  Focus areas
                </div>
                <ul className="flex flex-col gap-2 text-[13px] text-ink-1">
                  {[
                    `"Why now": 173 wpm + 3 fillers in 8s.`,
                    "Facing drops to 62% during metrics.",
                    "Closing CTA is implied, not stated.",
                  ].map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              className="rounded-md border border-line-2 bg-bg-1 p-4"
              style={{ borderLeft: "3px solid #22D3EE" }}
            >
              <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-300">
                Rewrite
              </div>
              <p className="font-serif text-[16px] italic leading-[1.55] text-ink-1">
                "Two things changed this year: webcam ML got fast enough to run in a
                browser tab, and founders started rehearsing on Loom. We sit between
                those two — measurable practice, no upload."
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-1 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-2">
                  Next focus · run 03
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Pace
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  CTA
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Retry prompt
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function DemoBanner() {
  return (
    <Section>
      <SectionHead
        num="07"
        eyebrow="Demo mode"
        title={
          <>
            For when wifi{" "}
            <span className="font-serif italic text-cyan-300">misbehaves</span>.
          </>
        }
        subtitle="One toggle swaps live capture for sample data. Always labeled."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-4 rounded-md border border-line-2 bg-bg-2 p-6">
          <h3 className="text-[20px] font-medium text-ink-0">
            Reliable demo flow, even if hardware doesn't cooperate.
          </h3>
          <p className="text-[14px] leading-[1.6] text-ink-2">
            Toggle demo mode and the product still tells the story — with an amber
            pill on every screen marking the data as sample.
          </p>
          <ul className="mt-2 flex flex-col gap-2 text-[13px] text-ink-1">
            {[
              "Same UI, sample data source.",
              "Amber pill always visible.",
              "Saved demo sessions prefixed with [Demo].",
            ].map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400">
              Demo source
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-y-2 font-mono text-[12px]">
            {[
              ["wpm", "147"],
              ["filler_rate", "0.023"],
              ["facing", "0.88"],
              ["score", "92"],
              ["retry_delta", "+10"],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-3">{k}</dt>
                <dd className="text-right text-ink-1 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}

function FinalCTA({ onPrimary }: { onPrimary: () => void }) {
  return (
    <section
      className="relative overflow-hidden border-t border-line-1 px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-16"
      style={{
        background:
          "radial-gradient(720px 360px at 50% 100%, rgba(6,182,212,0.10), transparent 60%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1320px] flex-col items-center text-center">
        <Eyebrow num="09">Ready when you are</Eyebrow>
        <h2 className="mt-5 max-w-3xl text-[36px] font-medium leading-[1.1] tracking-[-0.022em] text-ink-0 sm:text-[48px]">
          Practice the pitch{" "}
          <span className="font-serif italic text-cyan-300">before</span> the real
          moment.
        </h2>
        <p className="mt-4 text-[16px] text-ink-2">
          Three minutes. No install. No upload.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            variant="primary"
            onClick={onPrimary}
            icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            Start practicing
          </Button>
          <Button size="lg" variant="ghost">
            Try the demo
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Page
============================================================ */

export function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const goPractice = () => navigate(isAuthenticated ? "/practice" : "/signup");

  return (
    <div>
      <Hero onPrimary={goPractice} />
      <ProblemSection />
      <FeatureGrid />
      <HowItWorks />
      <UseCases />
      <ProofSection />
      <AIReportPreview />
      <DemoBanner />
      <FinalCTA onPrimary={goPractice} />
    </div>
  );
}

export default LandingPage;
