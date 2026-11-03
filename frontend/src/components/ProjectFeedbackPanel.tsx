import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  MessageSquareText,
  Plus,
  Printer,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FeedbackService, ProjectFeedbackService } from "../api";
import { useNotification } from "../context/NotificationContext";
import { ActionMenu } from "./ActionMenu";
import { cn } from "../utils";

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const fmtDate = (d?: string | null, withTime = false) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      })
    : "—";

const ago = (d?: string | null) => {
  if (!d) return "No responses yet";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  const units: [number, string][] = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
    [2592000, "month"],
    [31536000, "year"],
  ];
  let label = "";
  for (let i = units.length - 1; i >= 0; i--) {
    const [sec, name] = units[i];
    if (s >= sec) {
      const n = Math.floor(s / sec);
      label = `${n} ${name}${n === 1 ? "" : "s"} ago`;
      break;
    }
  }
  return `Last response ${label}`;
};

export function Stars({
  value,
  size = "w-4 h-4",
}: {
  value: number | null | undefined;
  size?: string;
}) {
  const v = value || 0;
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${v.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, v - (n - 1)));
        return (
          <span key={n} className={cn("relative inline-block", size)}>
            <Star
              className={cn("absolute inset-0 text-[var(--border-soft)]", size)}
            />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className={cn("text-amber-400 fill-amber-400", size)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Horizontal bar with label and count, for choice and rating breakdowns. */
const Bar: React.FC<{
  label: React.ReactNode;
  count: number;
  total: number;
  tone?: "brand" | "amber" | "emerald" | "rose";
}> = ({ label, count, total, tone = "brand" }) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const colors = {
    brand: "bg-brand-primary",
    amber: "bg-amber-400",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className="w-28 sm:w-40 shrink-0 truncate text-[var(--text-main)]"
        title={typeof label === "string" ? label : undefined}
      >
        {label}
      </span>
      <span className="flex-1 h-2.5 rounded-full bg-[var(--bg-app)] overflow-hidden">
        <span
          className={cn(
            "block h-full rounded-full transition-all",
            colors[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-20 shrink-0 text-right tabular-nums text-[var(--text-muted)]">
        <b className="text-[var(--text-main)]">{count}</b> · {pct}%
      </span>
    </div>
  );
};

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-1.5 text-2xl font-black text-[var(--text-main)] tabular-nums">
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs text-[var(--text-muted)]">{sub}</div>
      )}
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  RATING: "Rating",
  BOOLEAN: "Yes / No",
  RADIO: "Single choice",
  CHECKBOX: "Multiple choice",
  TEXT: "Text",
};

/* ------------------------------------------------------------------ */
/* Answer rendering (shared by Responses tab and CSV)                  */
/* ------------------------------------------------------------------ */

function answerValue(q: any, a: any): string {
  if (!a) return "";
  switch (q?.question_type) {
    case "RATING":
      return a.answer_rating ? String(a.answer_rating) : "";
    case "BOOLEAN":
      return a.answer_boolean === true
        ? "Yes"
        : a.answer_boolean === false
          ? "No"
          : "";
    case "CHECKBOX":
      return Array.isArray(a.answer_choices)
        ? a.answer_choices.join(", ")
        : a.answer_text || "";
    default:
      return (
        a.answer_text ||
        (Array.isArray(a.answer_choices) ? a.answer_choices.join(", ") : "")
      );
  }
}

function AnswerView({ q, a }: { q: any; a: any }) {
  const type = q?.question_type || "TEXT";
  if (!a)
    return (
      <span className="text-sm text-[var(--text-muted)] italic">No answer</span>
    );
  if (type === "RATING")
    return a.answer_rating ? (
      <span className="inline-flex items-center gap-2">
        <Stars value={a.answer_rating} size="w-5 h-5" />
        <b className="text-sm text-[var(--text-main)]">{a.answer_rating}/5</b>
      </span>
    ) : (
      <span className="text-sm text-[var(--text-muted)] italic">No answer</span>
    );
  if (type === "BOOLEAN")
    return (
      <span
        className={cn(
          "inline-block text-xs font-bold px-2.5 py-1 rounded-lg",
          a.answer_boolean === true
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : a.answer_boolean === false
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-[var(--bg-app)] text-[var(--text-muted)]",
        )}
      >
        {a.answer_boolean === true
          ? "Yes"
          : a.answer_boolean === false
            ? "No"
            : "No answer"}
      </span>
    );
  if (type === "RADIO" || type === "CHECKBOX") {
    const picked: string[] =
      Array.isArray(a.answer_choices) && a.answer_choices.length
        ? a.answer_choices
        : a.answer_text
          ? [a.answer_text]
          : [];
    return picked.length ? (
      <span className="flex flex-wrap gap-1.5">
        {picked.map((c) => (
          <span
            key={c}
            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-primary/10 text-brand-primary"
          >
            {c}
          </span>
        ))}
      </span>
    ) : (
      <span className="text-sm text-[var(--text-muted)] italic">No answer</span>
    );
  }
  return a.answer_text ? (
    <p className="text-sm text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">
      {a.answer_text}
    </p>
  ) : (
    <span className="text-sm text-[var(--text-muted)] italic">No answer</span>
  );
}

/** Average of a response's rating answers, for list chips. */
function responseRating(resp: any, questions: any[]): number | null {
  const ratingIds = new Set(
    questions.filter((q) => q.question_type === "RATING").map((q) => q.id),
  );
  const vals = (resp.answers || [])
    .filter((a: any) => ratingIds.has(a.question) && a.answer_rating)
    .map((a: any) => a.answer_rating);
  return vals.length
    ? vals.reduce((x: number, y: number) => x + y, 0) / vals.length
    : null;
}

/* ------------------------------------------------------------------ */
/* Results modal                                                       */
/* ------------------------------------------------------------------ */

function SummaryTab({
  summary,
  onPickProject,
}: {
  summary: any;
  /** Form mode: open one project's results from the breakdown. */
  onPickProject?: (eventId: number) => void;
}) {
  const [textLimit, setTextLimit] = useState<Record<number, number>>({});
  const days: any[] = summary.by_day || [];
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Responses"
          value={summary.total_responses}
          sub={
            summary.first_response_at
              ? `Since ${fmtDate(summary.first_response_at)}`
              : undefined
          }
        />
        <Kpi
          label="Average rating"
          value={
            summary.average_rating != null
              ? `${summary.average_rating.toFixed(1)} / 5`
              : "—"
          }
          sub={
            summary.average_rating != null ? (
              <Stars value={summary.average_rating} />
            ) : (
              "No rating questions answered"
            )
          }
        />
        <Kpi
          label="Satisfied"
          value={
            summary.satisfaction != null ? `${summary.satisfaction}%` : "—"
          }
          sub="Rated 4 or 5 stars"
        />
        <Kpi
          label="Last response"
          value={
            <span className="text-base">
              {fmtDate(summary.last_response_at)}
            </span>
          }
        />
      </div>

      {days.length > 1 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Responses over time
          </p>
          <div className="flex items-end gap-1 h-20">
            {days.map((d) => (
              <div
                key={d.date}
                className="flex-1 min-w-[4px] group relative"
                title={`${fmtDate(d.date)}: ${d.count}`}
              >
                <div
                  className="w-full rounded-t bg-brand-primary/70 group-hover:bg-brand-primary"
                  style={{ height: `${(d.count / maxDay) * 72 + 4}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1.5">
            <span>{fmtDate(days[0].date)}</span>
            <span>{fmtDate(days[days.length - 1].date)}</span>
          </div>
        </div>
      )}

      {summary.by_project?.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            By project · {summary.by_project.length} project
            {summary.by_project.length === 1 ? "" : "s"}
          </p>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="font-bold px-1 pb-2">Project</th>
                  <th className="font-bold px-1 pb-2 text-right">Responses</th>
                  <th className="font-bold px-1 pb-2">Avg rating</th>
                  <th className="font-bold px-1 pb-2 text-right">Satisfied</th>
                  <th className="font-bold px-1 pb-2 text-right">
                    Last response
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {summary.by_project.map((p: any) => (
                  <tr
                    key={p.project_feedback_id}
                    onClick={() => p.responses && onPickProject?.(p.event_id)}
                    className={cn(
                      p.responses &&
                        onPickProject &&
                        "cursor-pointer hover:bg-[var(--bg-app)]",
                    )}
                  >
                    <td className="px-1 py-2.5 font-bold text-[var(--text-main)] max-w-[220px] truncate">
                      {p.event_name}
                    </td>
                    <td className="px-1 py-2.5 text-right tabular-nums text-[var(--text-main)]">
                      {p.responses}
                    </td>
                    <td className="px-1 py-2.5">
                      {p.average_rating != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Stars value={p.average_rating} size="w-3.5 h-3.5" />
                          <b className="text-[var(--text-main)] tabular-nums">
                            {p.average_rating.toFixed(1)}
                          </b>
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-1 py-2.5 text-right tabular-nums text-[var(--text-main)]">
                      {p.satisfaction != null ? `${p.satisfaction}%` : "—"}
                    </td>
                    <td className="px-1 py-2.5 text-right text-[var(--text-muted)] whitespace-nowrap">
                      {fmtDate(p.last_response_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary.questions.map((q: any, i: number) => (
        <div
          key={q.id}
          className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Q{i + 1} · {TYPE_LABEL[q.question_type] || q.question_type}
              </p>
              <h4 className="font-bold text-[var(--text-main)] mt-0.5">
                {q.question_text}
              </h4>
            </div>
            <span className="shrink-0 text-xs text-[var(--text-muted)]">
              {q.answered} of {summary.total_responses} answered
            </span>
          </div>

          {q.question_type === "RATING" &&
            (q.answered ? (
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="sm:w-36 shrink-0 text-center sm:text-left">
                  <div className="text-4xl font-black text-[var(--text-main)] tabular-nums">
                    {q.average?.toFixed(1)}
                  </div>
                  <Stars value={q.average} />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {q.answered} ratings
                  </p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <Bar
                      key={n}
                      label={`${n} star${n === 1 ? "" : "s"}`}
                      count={q.distribution[String(n)] || 0}
                      total={q.answered}
                      tone={n >= 4 ? "emerald" : n === 3 ? "amber" : "rose"}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] italic">
                No ratings yet.
              </p>
            ))}

          {q.question_type === "BOOLEAN" &&
            (q.answered ? (
              <div>
                <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-app)]">
                  <span
                    className="bg-emerald-500"
                    style={{ width: `${(q.yes / q.answered) * 100}%` }}
                  />
                  <span
                    className="bg-rose-500"
                    style={{ width: `${(q.no / q.answered) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Yes · {q.yes} ({Math.round((q.yes / q.answered) * 100)}%)
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    No · {q.no} ({Math.round((q.no / q.answered) * 100)}%)
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] italic">
                No answers yet.
              </p>
            ))}

          {(q.question_type === "RADIO" || q.question_type === "CHECKBOX") &&
            (q.answered ? (
              <div className="space-y-2">
                {[...q.options]
                  .sort((a: any, b: any) => b.count - a.count)
                  .map((o: any) => (
                    <Bar
                      key={o.label}
                      label={o.label}
                      count={o.count}
                      total={q.answered}
                    />
                  ))}
                {q.question_type === "CHECKBOX" && (
                  <p className="text-xs text-[var(--text-muted)] pt-1">
                    People could pick more than one, so shares can add up to
                    more than 100%.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] italic">
                No answers yet.
              </p>
            ))}

          {q.question_type === "TEXT" &&
            (q.answers?.length ? (
              <div className="space-y-2">
                {q.answers
                  .slice(0, textLimit[q.id] || 5)
                  .map((a: any, k: number) => (
                    <div key={k} className="bg-[var(--bg-app)] rounded-xl p-3">
                      <p className="text-sm text-[var(--text-main)] whitespace-pre-wrap">
                        “{a.text}”
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1.5">
                        {a.client_name || "Anonymous"} ·{" "}
                        {fmtDate(a.submitted_at)}
                      </p>
                    </div>
                  ))}
                {q.answers.length > (textLimit[q.id] || 5) && (
                  <button
                    type="button"
                    onClick={() =>
                      setTextLimit((l) => ({
                        ...l,
                        [q.id]: (l[q.id] || 5) + 10,
                      }))
                    }
                    className="text-sm font-bold text-brand-primary hover:underline"
                  >
                    Show more ({q.answers.length - (textLimit[q.id] || 5)} more)
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] italic">
                No written answers yet.
              </p>
            ))}
        </div>
      ))}
    </div>
  );
}

function ResponsesTab({
  responses,
  questions,
  showProject = false,
}: {
  responses: any[];
  questions: any[];
  showProject?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    responses[0]?.id ?? null,
  );
  const [mobileDetail, setMobileDetail] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter((r) =>
      [
        r.client_name,
        r.client_email,
        showProject ? r.event_name : "",
        ...(r.answers || []).map(
          (a: any) =>
            `${a.answer_text || ""} ${
              (a.answer_choices || []).join?.(" ") || ""
            }`,
        ),
      ]
        .filter(Boolean)
        .some((s: string) => s.toLowerCase().includes(q)),
    );
  }, [responses, query]);

  const idx = filtered.findIndex((r) => r.id === selectedId);
  const selected = idx >= 0 ? filtered[idx] : filtered[0];
  const go = (d: number) => {
    const next =
      filtered[(Math.max(idx, 0) + d + filtered.length) % filtered.length];
    if (next) setSelectedId(next.id);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 md:h-full md:min-h-0">
      {/* List */}
      <div
        className={cn(
          "md:w-72 shrink-0 flex flex-col md:min-h-0",
          mobileDetail && "hidden md:flex",
        )}
      >
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or answer…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] outline-none focus:border-brand-primary"
          />
        </div>
        <div className="md:flex-1 md:overflow-y-auto space-y-2 pr-0.5">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-6">
              No responses match “{query}”.
            </p>
          )}
          {filtered.map((r) => {
            const rating = responseRating(r, questions);
            const on = selected?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedId(r.id);
                  setMobileDetail(true);
                }}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-colors",
                  on
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-[var(--border-soft)] bg-[var(--bg-surface)] hover:border-brand-primary/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-[var(--text-main)] truncate">
                    {r.client_name || "Anonymous"}
                  </span>
                  {rating != null && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                  {fmtDate(r.submitted_at, true)}
                  {r.client_email ? ` · ${r.client_email}` : ""}
                </p>
                {showProject && r.event_name && (
                  <p className="text-xs font-bold text-brand-primary mt-0.5 truncate">
                    {r.event_name}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div
        className={cn(
          "flex-1 min-w-0 md:overflow-y-auto",
          !mobileDetail && "hidden md:block",
        )}
      >
        {selected ? (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--border-soft)]">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileDetail(false)}
                  className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-brand-primary mb-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> All responses
                </button>
                <p className="font-bold text-[var(--text-main)] truncate">
                  {selected.client_name || "Anonymous"}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {selected.client_email ? `${selected.client_email} · ` : ""}
                  {fmtDate(selected.submitted_at, true)}
                  {showProject && selected.event_name
                    ? ` · ${selected.event_name}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-[var(--text-muted)] mr-1 tabular-nums">
                  {Math.max(idx, 0) + 1} / {filtered.length}
                </span>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-app)] text-[var(--text-muted)]"
                  aria-label="Previous response"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-app)] text-[var(--text-muted)]"
                  aria-label="Next response"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-[var(--border-soft)]">
              {questions.map((q, i) => (
                <div key={q.id} className="p-4">
                  <p className="text-xs font-bold text-[var(--text-muted)] mb-2">
                    Q{i + 1}. {q.question_text}
                  </p>
                  <AnswerView
                    q={q}
                    a={(selected.answers || []).find(
                      (a: any) => a.question === q.id,
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-10">
            Select a response.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Results for a feedback form: statistics per question plus every
 * response. Pass `projectFeedbackId` for one project; leave it out for the
 * form across all its projects (with a per-project breakdown and filter).
 */
export function FeedbackResultsModal({
  form,
  projectFeedbackId,
  eventName,
  onClose,
}: {
  form: any;
  projectFeedbackId?: number;
  eventName?: string;
  onClose: () => void;
}) {
  const { showNotification } = useNotification();
  const formMode = projectFeedbackId == null;
  const [tab, setTab] = useState<"summary" | "responses">("summary");
  const [summary, setSummary] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Form mode: narrow to one project ("" = all projects).
  const [eventFilter, setEventFilter] = useState<string>("");
  const [projects, setProjects] = useState<any[]>([]);
  const questions: any[] = form?.questions || [];

  useEffect(() => {
    let live = true;
    setLoading(true);
    (async () => {
      try {
        const params = eventFilter ? { event: eventFilter } : undefined;
        const [s, r] = await Promise.all(
          formMode
            ? [
                FeedbackService.getFormSummary(form.id, params),
                FeedbackService.getFormResponses(form.id, params),
              ]
            : [
                ProjectFeedbackService.getSummary(projectFeedbackId!),
                ProjectFeedbackService.getResponses(projectFeedbackId!),
              ],
        );
        if (!live) return;
        setSummary(s.data);
        setResponses(r.data);
        if (formMode && !eventFilter) setProjects(s.data.by_project || []);
      } catch (e) {
        console.error(e);
        showNotification("Failed to load responses", "error");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, projectFeedbackId, eventFilter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pickedProject = projects.find(
    (p) => String(p.event_id) === eventFilter,
  );

  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = [
      "Submitted",
      ...(formMode ? ["Project"] : []),
      "Name",
      "Email",
      ...questions.map((q) => q.question_text),
    ];
    const rows = responses.map((r) => [
      new Date(r.submitted_at).toISOString(),
      ...(formMode ? [r.event_name || ""] : []),
      r.client_name || "",
      r.client_email || "",
      ...questions.map((q) =>
        answerValue(
          q,
          (r.answers || []).find((a: any) => a.question === q.id),
        ),
      ),
    ]);
    const csv = [head, ...rows].map((row) => row.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    const scope = formMode
      ? pickedProject?.event_name || "all_projects"
      : eventName || "project";
    a.download = `${(form?.title || "feedback").replace(
      /[^\w-]+/g,
      "_",
    )}_${scope.replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-app)] sm:rounded-3xl w-full max-w-5xl h-full sm:h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[var(--bg-surface)] border-b border-[var(--border-soft)] shrink-0">
          <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-5 pb-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">
                {formMode
                  ? "Feedback form results"
                  : `${eventName || "Project"} · Feedback`}
              </p>
              <h2 className="text-lg font-bold text-[var(--text-main)] truncate">
                {form?.title || "Feedback form"}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {formMode && projects.length > 1 && (
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  aria-label="Filter by project"
                  className="max-w-[44vw] sm:max-w-[240px] px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-sm font-bold text-[var(--text-main)] outline-none truncate"
                >
                  <option value="">All projects ({projects.length})</option>
                  {projects.map((p) => (
                    <option key={p.event_id} value={p.event_id}>
                      {p.event_name} ({p.responses})
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={exportCsv}
                disabled={!responses.length}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-soft)] text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-full hover:bg-[var(--bg-app)]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex gap-1 px-4 sm:px-6">
            {(
              [
                ["summary", "Summary", BarChart3],
                ["responses", `Responses (${responses.length})`, Users],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors",
                  tab === key
                    ? "border-brand-primary text-[var(--text-main)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden p-4 sm:p-6">
          {loading ? (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
              Loading responses…
            </div>
          ) : !summary || summary.total_responses === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <MessageSquareText className="w-10 h-10 text-[var(--text-muted)] mb-3" />
              <p className="font-bold text-[var(--text-main)]">
                No responses yet
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">
                {formMode && !projects.length
                  ? "Attach this form to a project, then share its link or QR code. Responses will show up here."
                  : "Share the form link or print the QR code at the venue. Responses will show up here."}
              </p>
            </div>
          ) : tab === "summary" ? (
            <div className="md:h-full md:overflow-y-auto">
              <SummaryTab
                summary={
                  eventFilter ? { ...summary, by_project: undefined } : summary
                }
                onPickProject={
                  formMode ? (id) => setEventFilter(String(id)) : undefined
                }
              />
            </div>
          ) : (
            // Keyed so selection and search reset when the project filter changes.
            <React.Fragment key={eventFilter}>
              <ResponsesTab
                responses={responses}
                questions={questions}
                showProject={formMode && !eventFilter}
              />
            </React.Fragment>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Project section                                                     */
/* ------------------------------------------------------------------ */

/**
 * Feedback forms on a project: overall stats, one card per form, and a
 * results window with per-question statistics and individual responses.
 */
export function ProjectFeedbackPanel({
  projectFeedbacks,
  eventName,
  onAttach,
  onCopyLink,
  onPrintQr,
  onRemove,
}: {
  projectFeedbacks: any[];
  eventName?: string;
  onAttach: () => void;
  onCopyLink: (publicId: string) => void;
  onPrintQr: (pf: any) => void;
  onRemove: (id: number) => void;
}) {
  const [viewing, setViewing] = useState<any>(null);

  const totals = useMemo(() => {
    const responses = projectFeedbacks.reduce(
      (n, pf) => n + (pf.response_count || 0),
      0,
    );
    // Weight each form's average by its response count.
    let weighted = 0,
      weight = 0;
    projectFeedbacks.forEach((pf) => {
      if (pf.average_rating != null && pf.response_count) {
        weighted += pf.average_rating * pf.response_count;
        weight += pf.response_count;
      }
    });
    return { responses, rating: weight ? weighted / weight : null };
  }, [projectFeedbacks]);

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">
            Client Feedback
          </h3>
          {projectFeedbacks.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {totals.responses} response{totals.responses === 1 ? "" : "s"}{" "}
                across {projectFeedbacks.length} form
                {projectFeedbacks.length === 1 ? "" : "s"}
              </span>
              {totals.rating != null && (
                <span className="inline-flex items-center gap-1.5">
                  · <Stars value={totals.rating} size="w-3.5 h-3.5" />
                  <b className="text-[var(--text-main)]">
                    {totals.rating.toFixed(1)}
                  </b>
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={onAttach}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-[var(--text-on-brand)] rounded-xl hover:opacity-90 transition-opacity shadow-sm bg-brand-primary"
        >
          <Plus className="w-3 h-3" /> Attach Form
        </button>
      </div>

      {projectFeedbacks.length === 0 ? (
        <div className="text-center py-10 text-[var(--text-muted)] bg-[var(--bg-app)] rounded-xl border border-dashed border-[var(--border-soft)]">
          No feedback forms attached to this project.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projectFeedbacks.map((pf: any) => {
            const count = pf.response_count || 0;
            return (
              <div
                key={pf.id}
                className="p-4 border border-[var(--border-soft)] rounded-xl bg-[var(--bg-app)] shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-[var(--text-main)] truncate">
                      {pf.form?.title || "Unknown Form"}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {(pf.form?.questions || []).length} questions ·{" "}
                      {ago(pf.last_response_at)}
                    </p>
                  </div>
                  <ActionMenu
                    items={[
                      {
                        label: "Copy link",
                        icon: Copy,
                        onClick: () => onCopyLink(pf.public_id),
                      },
                      {
                        label: "Print QR",
                        icon: Printer,
                        onClick: () => onPrintQr(pf),
                      },
                      {
                        label: "Remove",
                        icon: Trash2,
                        danger: true,
                        onClick: () => onRemove(pf.id),
                      },
                    ]}
                  />
                </div>
                <div className="flex items-end justify-between gap-3 mt-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-2xl font-black text-[var(--text-main)] tabular-nums leading-none">
                        {count}
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-1">
                        Responses
                      </div>
                    </div>
                    {pf.average_rating != null && (
                      <div>
                        <div className="flex items-center gap-1.5 leading-none">
                          <span className="text-2xl font-black text-[var(--text-main)] tabular-nums">
                            {pf.average_rating.toFixed(1)}
                          </span>
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-1">
                          Avg rating
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewing(pf)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-brand-primary/50 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {count ? "View results" : "Open"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <FeedbackResultsModal
          form={viewing.form}
          projectFeedbackId={viewing.id}
          eventName={eventName}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
