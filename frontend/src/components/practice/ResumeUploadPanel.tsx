import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useResumeRag, type UseResumeRagResult } from "../../hooks/useResumeRag";
import type { ResumeDocumentSummary } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";

const ACCEPTED_TYPES = ".pdf,.docx,.txt";

type ResumeUploadPanelProps = {
  resumeRag?: UseResumeRagResult;
};

export function ResumeUploadPanel({ resumeRag: external }: ResumeUploadPanelProps = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const local = useResumeRag();
  const resumeRag = external ?? local;

  useEffect(() => {
    if (external) return;
    void resumeRag.loadStatus();
    void resumeRag.loadResumes();
    // Load once on mount; the hook methods are stable enough for this panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [external]);

  const maxFileMb = resumeRag.status?.maxFileSizeMb ?? 5;
  const canUpload =
    Boolean(selectedFile) &&
    resumeRag.uploadStatus !== "uploading" &&
    resumeRag.uploadStatus !== "processing" &&
    (resumeRag.status?.enabled ?? true);

  const selectedFileError = useMemo(() => {
    if (!selectedFile) return null;
    const suffix = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!suffix || !["pdf", "docx", "txt"].includes(suffix)) {
      return "Use a PDF, DOCX, or TXT resume.";
    }
    if (selectedFile.size > maxFileMb * 1024 * 1024) {
      return `File must be ${maxFileMb} MB or smaller.`;
    }
    return null;
  }, [maxFileMb, selectedFile]);

  const handleUpload = async () => {
    if (!selectedFile || selectedFileError) return;
    const uploaded = await resumeRag.uploadResume(selectedFile);
    if (uploaded) {
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      void resumeRag.selectResume(uploaded.id);
    }
  };

  return (
    <section className="rounded-md border border-line-2 bg-bg-2 p-5 shadow-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/12 text-cyan-300 ring-1 ring-cyan-400/20">
            <Database className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink-0">
                Resume-based questions
              </h2>
              <StatusBadge
                label={
                  resumeRag.status?.enabled === false
                    ? "disabled"
                    : resumeRag.status?.supabaseConfigured === false
                      ? "needs backend config"
                      : "ready"
                }
                tone={
                  resumeRag.status?.enabled === false ||
                  resumeRag.status?.supabaseConfigured === false
                    ? "muted"
                    : "cyan"
                }
              />
            </div>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-ink-2">
              Upload a resume to generate personalized interview prompts.
            </p>
            <p className="mt-1 text-[11px] text-ink-3">
              PDF, DOCX, TXT / max {maxFileMb} MB / embeddings stay user-owned.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <label
            className={cn(
              "block rounded-md border border-dashed p-5 transition",
              selectedFile
                ? "border-cyan-400/45 bg-cyan-500/[0.06]"
                : "border-line-3 bg-bg-1 hover:bg-bg-3",
            )}
          >
            <input
              accept={ACCEPTED_TYPES}
              className="sr-only"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                resumeRag.clearError();
              }}
              ref={inputRef}
              type="file"
            />
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-bg-3 text-cyan-300">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-0">
                  {selectedFile ? selectedFile.name : "Choose resume file"}
                </p>
                <p className="mt-1 text-xs text-ink-3">
                  {selectedFile
                    ? `${formatBytes(selectedFile.size)} selected`
                    : "Extract text, chunk, embed, and store for Interview Mode."}
                </p>
              </div>
            </div>
          </label>

          {selectedFileError && (
            <Message tone="warning" text={selectedFileError} />
          )}

          {resumeRag.error && <Message tone="error" text={resumeRag.error} />}

          {resumeRag.status?.supabaseConfigured === false && (
            <Message
              tone="warning"
              text="Resume storage is not configured on the backend. Set the backend Supabase service role environment variable and restart the server."
            />
          )}

          {resumeRag.warnings.map((warning) => (
            <Message key={warning} tone="warning" text={warning} />
          ))}

          {resumeRag.uploadStatus === "complete" && !resumeRag.error && (
            <Message tone="success" text="Resume processed and embedded." />
          )}

          {resumeRag.uploadStatus === "processing" && !resumeRag.error && (
            <Message
              tone="warning"
              text="Processing and embedding the resume. The first run may take a moment."
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canUpload || Boolean(selectedFileError)}
              icon={
                resumeRag.uploadStatus === "uploading" ||
                resumeRag.uploadStatus === "processing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )
              }
              onClick={() => void handleUpload()}
              size="sm"
            >
              {resumeRag.uploadStatus === "uploading" ||
              resumeRag.uploadStatus === "processing"
                ? "Processing"
                : "Upload resume"}
            </Button>
            <Button
              onClick={() => void resumeRag.loadResumes()}
              size="sm"
              variant="ghost"
            >
              Refresh list
            </Button>
          </div>

          {/* Embedding model info is intentionally not shown to users; it's an internal implementation detail. */}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink-0">
                Uploaded resumes
              </h3>
              <p className="mt-1 text-xs text-ink-3">
                Select a resume to enable personalized question generation.
              </p>
            </div>
            {resumeRag.isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-ink-3" aria-hidden="true" />
            )}
          </div>

          {resumeRag.resumes.length === 0 ? (
            <div className="rounded-md border border-line-1 bg-bg-1 p-4 text-sm text-ink-3">
              No resumes uploaded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {resumeRag.resumes.map((resume) => (
                <ResumeRow
                  isSelected={resumeRag.selectedResume?.id === resume.id}
                  key={resume.id}
                  onDelete={() => void resumeRag.deleteResume(resume.id)}
                  onSelect={() => void resumeRag.selectResume(resume.id)}
                  resume={resume}
                />
              ))}
            </div>
          )}

          {resumeRag.selectedResume && (
            <div className="rounded-md border border-cyan-400/25 bg-cyan-500/[0.05] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-cyan-200">
                    Selected resume
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink-0">
                    {resumeRag.selectedResume.filename}
                  </p>
                </div>
                <StatusBadge label={resumeRag.selectedResume.status} tone="success" />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <MiniStat
                  label="Status"
                  value={resumeRag.selectedResume.chunkCount > 0 ? "Ready" : "Processing"}
                />
                <MiniStat
                  label="Text"
                  value={`${resumeRag.selectedResume.textCharCount.toLocaleString()} chars`}
                />
                <MiniStat
                  label="Type"
                  value={resumeRag.selectedResume.fileType.toUpperCase()}
                />
              </div>
              {resumeRag.selectedResume.previewText && (
                <p className="mt-3 line-clamp-4 text-xs leading-5 text-ink-2">
                  {resumeRag.selectedResume.previewText}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ResumeRow({
  resume,
  isSelected,
  onSelect,
  onDelete,
}: {
  resume: ResumeDocumentSummary;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line-1 bg-bg-1 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
          <p className="truncate text-sm font-medium text-ink-0">{resume.filename}</p>
        </div>
        <p className="mt-1 text-xs text-ink-3">
          {resume.textCharCount.toLocaleString()} chars / {formatDate(resume.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSelect} size="sm" variant={isSelected ? "primary" : "ghost"}>
          {isSelected ? "Selected" : "Select"}
        </Button>
        <Button
          icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={onDelete}
          size="sm"
          variant="quiet"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line-1 bg-bg-1 px-3 py-2">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-ink-0">{value}</p>
    </div>
  );
}

function Message({
  text,
  tone,
}: {
  text: string;
  tone: "success" | "warning" | "error";
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-xs leading-5",
        tone === "success" &&
          "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200",
        tone === "warning" &&
          "border-amber-500/25 bg-amber-500/[0.06] text-amber-200",
        tone === "error" && "border-red-500/25 bg-red-500/[0.06] text-red-200",
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "saved";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
