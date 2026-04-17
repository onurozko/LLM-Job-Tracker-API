"use client";

import { useEffect, useMemo, useState } from "react";

import { api, type Application, type ApplicationStatus, type LocationType } from "@/lib/api";

const statusOptions: ApplicationStatus[] = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
];

const locationOptions: LocationType[] = ["remote", "onsite", "hybrid"];

const baseCardClass =
  "rounded-2xl border border-white/6 bg-slate-900/72 p-5 transition-all duration-150 ease-in-out";
const interactiveCardClass =
  "cursor-pointer hover:scale-[1.01] hover:bg-slate-900/90 hover:border-white/10";
const inputClass =
  "w-full rounded-2xl border border-white/8 bg-slate-900 px-3 py-2 text-sm text-[#E5E7EB] outline-none transition-all duration-150 ease-in-out placeholder:text-[#9CA3AF]/75 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]";
const selectClass =
  "rounded-2xl border border-white/8 bg-slate-900 px-3 py-2 text-sm text-[#E5E7EB] outline-none transition-all duration-150 ease-in-out focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]";
const primaryButtonClass =
  "rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-150 ease-in-out hover:brightness-110 hover:shadow-[0_0_18px_rgba(59,130,246,0.55)] active:scale-[0.97] disabled:opacity-60";

function statusClass(status: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    applied: "bg-blue-500/16 text-blue-200 border-blue-400/40",
    interviewing: "bg-amber-500/16 text-amber-200 border-amber-400/45",
    offer: "bg-emerald-500/16 text-emerald-200 border-emerald-400/45",
    rejected: "bg-rose-500/16 text-rose-200 border-rose-400/45",
    archived: "bg-slate-500/20 text-slate-200 border-slate-300/25",
  };
  return map[status];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function Home() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [error, setError] = useState<string>("");
  const [taskMessage, setTaskMessage] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  const [form, setForm] = useState({
    company: "",
    role: "",
    location_type: "remote" as LocationType,
    location: "",
    url: "",
  });

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      const statusMatch = statusFilter === "all" || a.status === statusFilter;
      const textMatch =
        !q ||
        a.company.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q);
      return statusMatch && textMatch;
    });
  }, [applications, search, statusFilter]);

  const selected = useMemo(
    () => filteredApplications.find((app) => app.id === selectedId) || filteredApplications[0] || null,
    [filteredApplications, selectedId]
  );

  const stats = useMemo(() => {
    const total = applications.length;
    const interviewing = applications.filter((a) => a.status === "interviewing").length;
    const offers = applications.filter((a) => a.status === "offer").length;
    const generated = applications.filter((a) => a.fit_bullets.length > 0).length;
    return { total, interviewing, offers, generated };
  }, [applications]);

  async function loadApplications(preferredId?: string) {
    try {
      setIsLoading(true);
      setError("");
      const list = await api.listApplications();
      setApplications(list);

      if (list.length === 0) {
        setSelectedId("");
        return;
      }

      if (preferredId && list.some((app) => app.id === preferredId)) {
        setSelectedId(preferredId);
        return;
      }

      if (selectedId && list.some((app) => app.id === selectedId)) {
        return;
      }

      setSelectedId(list[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        setIsLoading(true);
        setError("");
        const list = await api.listApplications();
        if (cancelled) return;
        setApplications(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load applications");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 2200);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  async function handleCreateApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setIsCreating(true);
      setError("");

      const created = await api.createApplication({
        company: form.company.trim(),
        role: form.role.trim(),
        location_type: form.location_type,
        location: form.location.trim(),
        url: form.url.trim(),
      });

      setForm({ company: "", role: "", location_type: "remote", location: "", url: "" });
      await loadApplications(created.id);
      setNotice("Application created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusChange(appId: string, status: ApplicationStatus) {
    try {
      setError("");
      await api.updateApplicationStatus(appId, status);
      await loadApplications(appId);
      setNotice("Status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function pollTask(taskId: string, appId: string) {
    for (let i = 0; i < 40; i += 1) {
      const task = await api.getTask(taskId);
      if (task.status === "done") {
        setTaskMessage("Generation complete.");
        await loadApplications(appId);
        setNotice("Insights generated successfully.");
        return;
      }
      if (task.status === "failed") throw new Error(task.error || "Generation failed");
      setTaskMessage(`Task ${task.status}...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("Task timed out while waiting for result");
  }

  async function handleGenerate(appId: string) {
    try {
      setIsGenerating(true);
      setTaskMessage("Queued generation...");
      setError("");
      const { task_id } = await api.triggerGeneration(appId);
      await pollTask(task_id, appId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights");
      setTaskMessage("");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyRecruiterMessage() {
    if (!selected?.recruiter_message) return;
    try {
      await navigator.clipboard.writeText(selected.recruiter_message);
      setNotice("Recruiter message copied.");
    } catch {
      setNotice("Copy failed in this browser.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-white/6 bg-slate-900/78 p-6 backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/6 via-transparent to-blue-300/4" />
        <div className="pointer-events-none absolute -top-16 left-1/3 h-36 w-36 rounded-full bg-blue-500/6 blur-3xl" />
        <p className="text-sm uppercase tracking-[0.24em] text-blue-300/90">LLM Job Tracker</p>
        <h1 className="relative mt-2 text-[32px] font-bold leading-tight text-[#E5E7EB]">Application Command Center</h1>
        <p className="relative mt-3 text-sm text-[#9CA3AF]/95">
          Manage applications, track pipeline health, and generate tailored notes via background tasks.
        </p>
      </header>

      <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={stats.total} accentClass="text-blue-200" primary />
        <StatCard label="Interviewing" value={stats.interviewing} accentClass="text-[#E5E7EB]" />
        <StatCard label="Offers" value={stats.offers} accentClass="text-emerald-300" />
        <StatCard label="Generated Notes" value={stats.generated} accentClass="text-[#CBD5E1]" />
      </section>

      {error ? <Alert tone="error" message={error} /> : null}
      {taskMessage ? (
        <Alert
          tone={taskMessage.toLowerCase().includes("complete") ? "success" : "info"}
          message={taskMessage}
          icon={taskMessage.toLowerCase().includes("complete") ? "✓" : "ℹ"}
        />
      ) : null}
      {notice ? <Alert tone="success" message={notice} /> : null}

      <section className="grid gap-7 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-9">
          <div className={baseCardClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[20px] font-semibold text-[#E5E7EB]">Applications</h2>
              <button
                onClick={() => void loadApplications()}
                className="rounded-2xl border border-white/8 bg-slate-900 px-3 py-1.5 text-sm font-medium text-[#E5E7EB] transition-all duration-150 ease-in-out hover:bg-slate-800"
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, role, location..."
                className={inputClass}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | ApplicationStatus)}
                className={selectClass}
              >
                <option value="all">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {filteredApplications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-[#9CA3AF]">
                  No matching applications. Try a different filter or create one.
                </div>
              ) : (
                filteredApplications.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedId(app.id)}
                    className={`${baseCardClass} ${interactiveCardClass} w-full p-4 text-left ${
                      selectedId === app.id ? "border-blue-500/45 bg-blue-500/10" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#E5E7EB]">{app.company}</p>
                        <p className="text-sm text-[#9CA3AF]">{app.role}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] text-[#9CA3AF]/70">Updated: {formatDate(app.updated_at)}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {selected ? (
            <div className={baseCardClass}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-semibold text-[#E5E7EB]">{selected.company}</h2>
                  <p className="text-sm text-[#9CA3AF]">{selected.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selected.status}
                    onChange={(e) => void handleStatusChange(selected.id, e.target.value as ApplicationStatus)}
                    className={selectClass}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => void handleGenerate(selected.id)} disabled={isGenerating} className={`${primaryButtonClass} group`}>
                    {isGenerating ? "Generating..." : "✦ Generate Notes"}
                  </button>
                </div>
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <InfoRow label="Location Type" value={selected.location_type} />
                <InfoRow label="Location" value={selected.location || "-"} />
                <InfoRow label="URL" value={selected.url || "-"} />
                <InfoRow label="Created" value={formatDate(selected.created_at)} />
              </dl>

              {selected.url ? (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm font-medium text-blue-300 transition-all duration-150 ease-in-out hover:text-blue-200 hover:underline"
                >
                  Open job posting
                </a>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <CardSection title="Why I Fit" content={selected.fit_bullets} emptyLabel="No generated bullets yet." compact />
                <CardSection
                  title="Recruiter Message"
                  content={selected.recruiter_message ? [selected.recruiter_message] : []}
                  emptyLabel="No generated message yet."
                  actionLabel={selected.recruiter_message ? "Copy" : undefined}
                  onAction={selected.recruiter_message ? handleCopyRecruiterMessage : undefined}
                />
                <CardSection
                  title="Interview Checklist"
                  content={selected.interview_checklist}
                  emptyLabel="No generated checklist yet."
                />
              </div>
            </div>
          ) : null}
        </div>

        <aside className={`${baseCardClass} h-fit`}>
          <h2 className="text-[20px] font-semibold text-[#E5E7EB]">Add Application</h2>
          <p className="mt-1 text-sm text-[#9CA3AF]">Create a new entry in your pipeline.</p>

          <form className="mt-5 space-y-4" onSubmit={handleCreateApplication}>
            <Input label="Company" value={form.company} onChange={(v) => setForm((prev) => ({ ...prev, company: v }))} required />
            <Input label="Role" value={form.role} onChange={(v) => setForm((prev) => ({ ...prev, role: v }))} required />
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#9CA3AF]">Location Type</label>
              <select
                value={form.location_type}
                onChange={(e) => setForm((prev) => ({ ...prev, location_type: e.target.value as LocationType }))}
                className={`${selectClass} w-full`}
              >
                {locationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Location" value={form.location} onChange={(v) => setForm((prev) => ({ ...prev, location: v }))} />
            <Input label="Job URL" value={form.url} onChange={(v) => setForm((prev) => ({ ...prev, url: v }))} />

            <button
              type="submit"
              disabled={isCreating || !form.company.trim() || !form.role.trim()}
              className="mt-2 w-full rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-150 ease-in-out hover:bg-blue-500 active:scale-[0.97] disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create Application"}
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function Alert({
  tone,
  message,
  icon,
}: {
  tone: "error" | "info" | "success";
  message: string;
  icon?: string;
}) {
  const styles = {
    error: "border-rose-400/30 bg-rose-500/15 text-rose-200",
    info: "border-blue-400/40 bg-blue-500/18 text-blue-100",
    success: "border-emerald-400/40 bg-emerald-500/18 text-emerald-100",
  };

  return (
    <div className={`mb-5 rounded-2xl border p-3 text-sm ${styles[tone]}`}>
      <span className="inline-flex items-center gap-2 font-medium">
        <span>{icon ?? (tone === "success" ? "✓" : tone === "error" ? "!" : "ℹ")}</span>
        <span>{message}</span>
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  accentClass,
  primary = false,
}: {
  label: string;
  value: number;
  accentClass: string;
  primary?: boolean;
}) {
  return (
    <div className={`${baseCardClass} hover:scale-[1.01] hover:bg-slate-900/88`}>
      <p className="text-xs uppercase tracking-widest text-[#9CA3AF]">{label}</p>
      <p className={`mt-2 ${primary ? "text-[30px]" : "text-[28px]"} font-bold ${accentClass}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-slate-900 p-3 transition-all duration-150 ease-in-out hover:bg-slate-900/88">
      <dt className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{label}</dt>
      <dd className="mt-1 break-all text-sm text-[#E5E7EB]">{value}</dd>
    </div>
  );
}

function CardSection({
  title,
  content,
  emptyLabel,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  content: string[];
  emptyLabel: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/45 p-3.5 transition-all duration-150 ease-in-out hover:bg-slate-900/55">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#E5E7EB]">{title}</h3>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="rounded-xl border border-white/8 px-2.5 py-1 text-xs font-medium text-[#E5E7EB] transition-all duration-150 ease-in-out hover:bg-slate-800"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {content.length === 0 ? (
        <p className="text-sm text-[#9CA3AF]">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-[#E5E7EB]">
          {content.map((line, idx) => (
            <li
              key={`${title}-${idx}`}
              className={`rounded-lg border border-white/5 ${compact ? "bg-white/[0.03] px-2 py-1.5" : "bg-slate-800/45 p-2"}`}
            >
              {compact ? (
                <span className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-300/85" />
                  <span>{line}</span>
                </span>
              ) : (
                line
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[#9CA3AF]">{label}</label>
      <input required={required} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}
