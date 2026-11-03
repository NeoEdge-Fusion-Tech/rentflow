import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CalendarDays,
  Package,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  Truck,
  Users,
} from "lucide-react";
import { AnalyticsService } from "../api";
import { useVisibility } from "../context/VisibilityContext";
import { cn } from "../utils";

/* ------------------------------------------------------------------ */
/* Date ranges                                                         */
/* ------------------------------------------------------------------ */

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const PRESETS: { key: string; label: string; range: () => [string, string] }[] =
  [
    {
      key: "this_month",
      label: "This month",
      range: () => {
        const n = new Date();
        return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), iso(n)];
      },
    },
    {
      key: "3m",
      label: "Last 3 months",
      range: () => {
        const n = new Date();
        return [iso(new Date(n.getFullYear(), n.getMonth() - 2, 1)), iso(n)];
      },
    },
    {
      key: "6m",
      label: "Last 6 months",
      range: () => {
        const n = new Date();
        return [iso(new Date(n.getFullYear(), n.getMonth() - 5, 1)), iso(n)];
      },
    },
    {
      key: "12m",
      label: "Last 12 months",
      range: () => {
        const n = new Date();
        return [iso(new Date(n.getFullYear(), n.getMonth() - 11, 1)), iso(n)];
      },
    },
    {
      key: "ytd",
      label: "This year",
      range: () => {
        const n = new Date();
        return [iso(new Date(n.getFullYear(), 0, 1)), iso(n)];
      },
    },
    {
      key: "last_year",
      label: "Last year",
      range: () => {
        const y = new Date().getFullYear() - 1;
        return [`${y}-01-01`, `${y}-12-31`];
      },
    },
  ];

const monthLabel = (m: string, long = false) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, {
    month: long ? "long" : "short",
    year: long ? "numeric" : "2-digit",
  });
};

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Card({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-5 min-w-0",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Change({
  value,
  invert = false,
}: {
  value: number | null | undefined;
  invert?: boolean;
}) {
  if (value == null)
    return <span className="text-[var(--text-muted)]">No earlier data</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-bold",
        good
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {Math.abs(value)}%
      <span className="font-normal text-[var(--text-muted)] ml-1">
        vs previous
      </span>
    </span>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-[var(--text-muted)] text-center py-8">
    {children}
  </p>
);

/** Ranked row with a proportional bar behind the main figure. */
const RankRow: React.FC<{
  rank: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  value: React.ReactNode;
  share: number;
  to?: string;
  tone?: string;
}> = ({ rank, title, sub, value, share, to, tone = "bg-brand-primary/10" }) => {
  const body = (
    <div className="relative flex items-center gap-3 py-2.5 px-3 rounded-xl overflow-hidden">
      <span
        className={cn("absolute inset-y-0 left-0 rounded-xl", tone)}
        style={{ width: `${Math.max(share, 2)}%` }}
      />
      <span
        className={cn(
          "relative w-6 h-6 shrink-0 rounded-full text-xs font-black flex items-center justify-center",
          rank === 1
            ? "bg-amber-400 text-white"
            : "bg-[var(--bg-app)] text-[var(--text-muted)]",
        )}
      >
        {rank}
      </span>
      <span className="relative flex-1 min-w-0">
        <span className="block text-sm font-bold text-[var(--text-main)] truncate">
          {title}
        </span>
        {sub && (
          <span className="block text-xs text-[var(--text-muted)] truncate">
            {sub}
          </span>
        )}
      </span>
      <span className="relative shrink-0 text-sm font-black text-[var(--text-main)] tabular-nums text-right">
        {value}
      </span>
    </div>
  );
  return to ? (
    <Link
      to={to}
      className="block hover:bg-[var(--bg-app)] rounded-xl transition-colors"
    >
      {body}
    </Link>
  ) : (
    body
  );
};

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex p-0.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-soft)]">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "px-2 py-1 text-[11px] font-bold rounded-md transition-colors",
            value === k
              ? "bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-main)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  paid: "bg-emerald-500",
  partially_paid: "bg-amber-400",
  issued: "bg-blue-500",
  cancelled: "bg-rose-500",
  request: "bg-amber-400",
  processed: "bg-sky-500",
  booked: "bg-indigo-500",
  confirmed: "bg-blue-500",
  picked_up: "bg-violet-500",
  returned: "bg-emerald-500",
};
const pretty = (s: string) =>
  s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function Analytics() {
  const { isRevenueHidden } = useVisibility();
  const [preset, setPreset] = useState("12m");
  const [custom, setCustom] = useState<[string, string]>(() =>
    PRESETS[3].range(),
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectSort, setProjectSort] = useState<
    "profit" | "revenue" | "margin"
  >("profit");
  const [productSort, setProductSort] = useState<
    "bookings" | "quantity" | "revenue"
  >("bookings");

  const range = useMemo<[string, string]>(
    () =>
      preset === "custom"
        ? custom
        : PRESETS.find((p) => p.key === preset)!.range(),
    [preset, custom],
  );

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    AnalyticsService.getOverview({ start: range[0], end: range[1] })
      .then((res) => live && setData(res.data))
      .catch((e) => {
        if (!live) return;
        setError(
          e.response?.status === 403
            ? "You don't have access to analytics. Ask an admin to give your role the Reports permission."
            : "Couldn't load analytics. Please try again.",
        );
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [range]);

  const sym =
    data?.currency?.symbol || localStorage.getItem("currencySymbol") || "";
  const money = (v: number | null | undefined, compact = false) => {
    if (isRevenueHidden) return "••••";
    const n = Number(v || 0);
    const s = compact
      ? Intl.NumberFormat(undefined, {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(Math.abs(n))
      : Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `${n < 0 ? "−" : ""}${sym}${s}`;
  };

  const t = data?.totals;
  const chart = (data?.monthly || []).map((m: any) => ({
    ...m,
    label: monthLabel(m.month),
  }));

  const projects = useMemo(() => {
    const list = [...(data?.top_projects || [])];
    list.sort(
      (a, b) => (b[projectSort] ?? -Infinity) - (a[projectSort] ?? -Infinity),
    );
    return list;
  }, [data, projectSort]);
  const products = useMemo(() => {
    const list = [...(data?.top_products || [])];
    list.sort((a, b) => b[productSort] - a[productSort]);
    return list;
  }, [data, productSort]);
  const max = (list: any[], key: string) =>
    Math.max(1, ...list.map((x) => Math.abs(Number(x[key]) || 0)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-primary" /> Analytics
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            How the business is doing: money, best months, and your top
            projects, clients, products and vendors.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={preset}
            onChange={(e) => {
              if (e.target.value === "custom") setCustom(range);
              setPreset(e.target.value);
            }}
            className="px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-sm font-bold text-[var(--text-main)] outline-none"
          >
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom range</option>
          </select>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={custom[0]}
                max={custom[1]}
                onChange={(e) => setCustom([e.target.value, custom[1]])}
                className="px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)]"
              />
              <span className="text-[var(--text-muted)] text-sm">to</span>
              <input
                type="date"
                value={custom[1]}
                min={custom[0]}
                onChange={(e) => setCustom([custom[0], e.target.value])}
                className="px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)]"
              />
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-10 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-[var(--text-main)] font-bold">{error}</p>
        </div>
      ) : !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-soft)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "space-y-6 transition-opacity",
            loading && "opacity-60",
          )}
        >
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              {
                label: "Revenue",
                value: money(t.revenue),
                sub: <Change value={data.changes.revenue} />,
                hint: `${t.invoice_count} invoices`,
              },
              {
                label: "Cash collected",
                value: money(t.collected),
                sub: <Change value={data.changes.collected} />,
                hint:
                  t.collection_rate != null
                    ? `${t.collection_rate}% of revenue`
                    : undefined,
              },
              {
                label: "Expenses",
                value: money(t.expenses),
                sub: <Change value={data.changes.expenses} invert />,
                hint: `Projects ${money(
                  t.project_expenses,
                  true,
                )} · General ${money(t.general_expenses, true)}`,
              },
              {
                label: t.profit < 0 ? "Loss" : "Profit",
                value: (
                  <span
                    className={
                      t.profit < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }
                  >
                    {money(t.profit)}
                  </span>
                ),
                sub: <Change value={data.changes.profit} />,
                hint: t.margin != null ? `${t.margin}% margin` : undefined,
              },
              {
                label: "Outstanding",
                value: money(t.outstanding),
                sub: t.overdue_count ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    {money(t.overdue)} overdue
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">
                    Nothing overdue
                  </span>
                ),
                hint: `${t.overdue_count} overdue invoice${
                  t.overdue_count === 1 ? "" : "s"
                }`,
              },
              {
                label: "Bookings",
                value: t.bookings,
                sub: <Change value={data.changes.bookings} />,
                hint: `${t.projects} projects · ${t.new_clients} new clients`,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-4 min-w-0"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {k.label}
                </p>
                <p
                  className="mt-1.5 text-xl sm:text-2xl font-black text-[var(--text-main)] tabular-nums truncate"
                  style={{ fontFamily: "'Noto Sans', sans-serif" }}
                >
                  {k.value}
                </p>
                <div className="mt-1 text-xs">{k.sub}</div>
                {k.hint && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                    {k.hint}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          <Card title="Revenue, expenses and profit by month" icon={BarChart3}>
            {chart.some((m: any) => m.revenue || m.expenses || m.collected) ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                      tickFormatter={(v) =>
                        isRevenueHidden
                          ? ""
                          : Intl.NumberFormat(undefined, {
                              notation: "compact",
                            }).format(v)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-surface)",
                        borderRadius: "12px",
                        border: "1px solid var(--border-soft)",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        color: "var(--text-main)",
                      }}
                      itemStyle={{ color: "var(--text-main)" }}
                      labelStyle={{ color: "var(--text-muted)" }}
                      formatter={(v: any) => money(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      name="Expenses"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="profit"
                      name="Profit / Loss"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      dataKey="collected"
                      name="Cash collected"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      type="monotone"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty>No invoices or expenses in this period.</Empty>
            )}
          </Card>

          {/* Month highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                label: "Top revenue month",
                icon: Trophy,
                tone: "text-amber-500",
                m: data.highlights.best_revenue_month,
                value: (m: any) => money(m.revenue),
                sub: (m: any) => `${money(m.profit)} profit`,
              },
              {
                label: "Most profitable month",
                icon: TrendingUp,
                tone: "text-emerald-500",
                m: data.highlights.best_profit_month,
                value: (m: any) => money(m.profit),
                sub: (m: any) => `on ${money(m.revenue)} revenue`,
              },
              {
                label:
                  data.highlights.worst_month?.profit < 0
                    ? "Biggest loss month"
                    : "Weakest month",
                icon: TrendingDown,
                tone: "text-rose-500",
                m: data.highlights.worst_month,
                value: (m: any) => money(m.profit),
                sub: (m: any) =>
                  `${money(m.revenue)} in, ${money(m.expenses)} out`,
              },
              {
                label: "Months at a loss",
                icon: AlertTriangle,
                tone: "text-amber-500",
                m: { month: null },
                value: () => `${data.highlights.loss_months.length}`,
                sub: () =>
                  data.highlights.loss_months.length
                    ? data.highlights.loss_months
                        .map((m: any) => monthLabel(m.month))
                        .join(", ")
                    : "Every active month made a profit",
              },
            ].map((h) => (
              <div
                key={h.label}
                className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-4 min-w-0"
              >
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <h.icon className={cn("w-4 h-4", h.tone)} /> {h.label}
                </p>
                {h.m ? (
                  <>
                    {h.m.month && (
                      <p className="mt-2 text-sm font-bold text-[var(--text-main)]">
                        {monthLabel(h.m.month, true)}
                      </p>
                    )}
                    <p
                      className={cn(
                        "text-xl font-black tabular-nums text-[var(--text-main)]",
                        !h.m.month && "mt-2",
                      )}
                      style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                      {h.value(h.m)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                      {h.sub(h.m)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    No activity yet
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Leaderboards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card
              title="Top projects"
              icon={Briefcase}
              action={
                <Segmented
                  value={projectSort}
                  onChange={setProjectSort}
                  options={[
                    ["profit", "Profit"],
                    ["revenue", "Revenue"],
                    ["margin", "Margin"],
                  ]}
                />
              }
            >
              {projects.length ? (
                <div className="space-y-0.5">
                  {projects.slice(0, 8).map((p: any, i: number) => (
                    <RankRow
                      key={p.id}
                      rank={i + 1}
                      to={`/events/${p.id}`}
                      title={p.name}
                      sub={`${money(p.revenue)} revenue · ${money(
                        p.expenses,
                      )} costs${
                        p.margin != null ? ` · ${p.margin}% margin` : ""
                      }`}
                      value={
                        projectSort === "margin"
                          ? p.margin != null
                            ? `${p.margin}%`
                            : "—"
                          : money(p[projectSort])
                      }
                      share={
                        (Math.abs(Number(p[projectSort]) || 0) /
                          max(projects, projectSort)) *
                        100
                      }
                      tone={
                        p.profit < 0 ? "bg-rose-500/10" : "bg-emerald-500/10"
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty>No projects dated in this period.</Empty>
              )}
            </Card>

            <Card title="Top clients" icon={Users}>
              {data.top_clients.length ? (
                <div className="space-y-0.5">
                  {data.top_clients.slice(0, 8).map((c: any, i: number) => (
                    <RankRow
                      key={c.id}
                      rank={i + 1}
                      title={c.name}
                      sub={`${c.invoices} invoice${
                        c.invoices === 1 ? "" : "s"
                      }${
                        c.bookings
                          ? ` · ${c.bookings} booking${
                              c.bookings === 1 ? "" : "s"
                            }`
                          : ""
                      }${
                        c.outstanding > 0
                          ? ` · ${money(c.outstanding)} owed`
                          : " · fully paid"
                      }`}
                      value={money(c.billed)}
                      share={(c.billed / max(data.top_clients, "billed")) * 100}
                    />
                  ))}
                </div>
              ) : (
                <Empty>No invoiced clients in this period.</Empty>
              )}
            </Card>

            <Card
              title="Top rented products"
              icon={Package}
              action={
                <Segmented
                  value={productSort}
                  onChange={setProductSort}
                  options={[
                    ["bookings", "Bookings"],
                    ["quantity", "Units"],
                    ["revenue", "Revenue"],
                  ]}
                />
              }
            >
              {products.length ? (
                <div className="space-y-0.5">
                  {products.slice(0, 8).map((p: any, i: number) => (
                    <RankRow
                      key={p.id}
                      rank={i + 1}
                      title={p.name}
                      sub={`${p.bookings} booking${
                        p.bookings === 1 ? "" : "s"
                      } · ${p.quantity} unit${
                        p.quantity === 1 ? "" : "s"
                      } rented · ${money(p.revenue)}`}
                      value={
                        productSort === "revenue"
                          ? money(p.revenue)
                          : `${p[productSort]}`
                      }
                      share={
                        (p[productSort] / max(products, productSort)) * 100
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty>No rentals booked in this period.</Empty>
              )}
            </Card>

            <Card title="Top vendors" icon={Truck}>
              {data.top_vendors.length ? (
                <div className="space-y-0.5">
                  {data.top_vendors.slice(0, 8).map((v: any, i: number) => (
                    <RankRow
                      key={v.id}
                      rank={i + 1}
                      title={
                        <span className="inline-flex items-center gap-2">
                          {v.name}
                          {v.rating != null && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                              <Star className="w-3 h-3 fill-current" />
                              {v.rating}
                            </span>
                          )}
                        </span>
                      }
                      sub={`${v.service || "Vendor"} · ${v.projects} project${
                        v.projects === 1 ? "" : "s"
                      }${
                        v.on_time_rate != null
                          ? ` · ${v.on_time_rate}% on time`
                          : ""
                      }`}
                      value={money(v.spend)}
                      share={(v.spend / max(data.top_vendors, "spend")) * 100}
                      tone="bg-rose-500/10"
                    />
                  ))}
                </div>
              ) : (
                <Empty>No vendor expenses in this period.</Empty>
              )}
            </Card>
          </div>

          {/* Other insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Card title="Revenue by event type" icon={CalendarDays}>
              {data.event_types.length ? (
                <div className="space-y-2.5">
                  {data.event_types.map((e: any) => (
                    <div key={e.event_type}>
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-[var(--text-main)] truncate">
                          {e.event_type}
                        </span>
                        <span className="text-[var(--text-muted)] tabular-nums shrink-0 ml-2">
                          {money(e.revenue)} · {e.bookings}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-app)] mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{
                            width: `${
                              (e.revenue / max(data.event_types, "revenue")) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No bookings in this period.</Empty>
              )}
            </Card>

            <Card title="Busiest days" icon={CalendarDays}>
              {data.weekdays.some((d: any) => d.bookings) ? (
                <div className="flex items-end justify-between gap-2 h-36">
                  {data.weekdays.map((d: any) => {
                    const top = max(data.weekdays, "bookings");
                    return (
                      <div
                        key={d.day}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                        title={`${d.day}: ${d.bookings}`}
                      >
                        <span className="text-[11px] font-bold text-[var(--text-main)]">
                          {d.bookings || ""}
                        </span>
                        <div
                          className={cn(
                            "w-full rounded-t-lg",
                            d.bookings === top
                              ? "bg-brand-primary"
                              : "bg-brand-primary/30",
                          )}
                          style={{
                            height: `${(d.bookings / top) * 100}%`,
                            minHeight: 4,
                          }}
                        />
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {d.day.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty>No bookings in this period.</Empty>
              )}
            </Card>

            <Card title="Sales and satisfaction" icon={Star}>
              <dl className="grid grid-cols-2 gap-3">
                {[
                  [
                    "Quote win rate",
                    data.quotes.win_rate != null
                      ? `${data.quotes.win_rate}%`
                      : "—",
                    `${data.quotes.won} of ${data.quotes.sent} quotes`,
                  ],
                  [
                    "Average invoice",
                    money(t.average_invoice),
                    `${t.invoice_count} invoices`,
                  ],
                  [
                    "Client rating",
                    data.feedback.average_rating != null
                      ? `${data.feedback.average_rating} / 5`
                      : "—",
                    `${data.feedback.responses} feedback responses`,
                  ],
                  [
                    "Satisfied clients",
                    data.feedback.satisfaction != null
                      ? `${data.feedback.satisfaction}%`
                      : "—",
                    "Rated 4 or 5 stars",
                  ],
                ].map(([label, value, sub]) => (
                  <div
                    key={label}
                    className="bg-[var(--bg-app)] rounded-xl p-3 min-w-0"
                  >
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {label}
                    </dt>
                    <dd className="text-lg font-black text-[var(--text-main)] tabular-nums truncate">
                      {value}
                    </dd>
                    <dd className="text-[11px] text-[var(--text-muted)] truncate">
                      {sub}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card title="Invoices by status" icon={BarChart3}>
              {data.invoice_status.length ? (
                <StatusBars
                  items={data.invoice_status.map((s: any) => ({
                    ...s,
                    value: s.count,
                    extra: money(s.amount),
                  }))}
                />
              ) : (
                <Empty>No invoices in this period.</Empty>
              )}
            </Card>

            <Card title="Bookings by status" icon={CalendarDays}>
              {data.booking_status.length ? (
                <StatusBars
                  items={data.booking_status.map((s: any) => ({
                    ...s,
                    value: s.count,
                  }))}
                />
              ) : (
                <Empty>No bookings in this period.</Empty>
              )}
            </Card>

            <Card title="Needs attention" icon={AlertTriangle}>
              {data.bottom_projects.filter(
                (p: any) =>
                  p.profit <= 0 || (p.margin != null && p.margin < 20),
              ).length ? (
                <div className="space-y-2">
                  {data.bottom_projects
                    .filter(
                      (p: any) =>
                        p.profit <= 0 || (p.margin != null && p.margin < 20),
                    )
                    .map((p: any) => (
                      <Link
                        key={p.id}
                        to={`/events/${p.id}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-app)] hover:bg-rose-500/5 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[var(--text-main)] truncate">
                            {p.name}
                          </span>
                          <span className="block text-xs text-[var(--text-muted)]">
                            {p.margin != null
                              ? `${p.margin}% margin`
                              : "No revenue linked"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "text-sm font-black tabular-nums shrink-0",
                            p.profit < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {money(p.profit)}
                        </span>
                      </Link>
                    ))}
                </div>
              ) : (
                <Empty>No loss-making or thin-margin projects. Nice.</Empty>
              )}
            </Card>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Revenue counts issued, part-paid and paid invoices by issue date.
            Cash collected counts completed payments by payment date. Expenses
            include project and general expenses. Projects are placed in a
            period by their start date. Vendor ratings are all-time.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBars({
  items,
}: {
  items: { status: string; value: number; extra?: string }[];
}) {
  const total = items.reduce((n, i) => n + i.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-app)] mb-3">
        {items.map((i) => (
          <span
            key={i.status}
            className={STATUS_TONE[i.status] || "bg-slate-400"}
            style={{ width: `${(i.value / total) * 100}%` }}
            title={`${pretty(i.status)}: ${i.value}`}
          />
        ))}
      </div>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li
            key={i.status}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex items-center gap-2 text-[var(--text-main)]">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  STATUS_TONE[i.status] || "bg-slate-400",
                )}
              />
              {pretty(i.status)}
            </span>
            <span className="text-[var(--text-muted)] tabular-nums">
              <b className="text-[var(--text-main)]">{i.value}</b>
              {i.extra ? ` · ${i.extra}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
