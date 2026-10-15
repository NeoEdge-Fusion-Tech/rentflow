import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, ChevronDown, Coins, Search } from "lucide-react";
import { AuthService, CurrencyService, OrganizationService } from "../api";
import { useNotification } from "../context/NotificationContext";
import { cn } from "../utils";

interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
}

interface CurrencyBadgeProps {
  /** Called with the new symbol after the organization's currency changes. */
  onChange?: (symbol: string) => void;
}

const POPOVER_WIDTH = 280;

/**
 * Shows the organization's currency and lets owners/admins change it in
 * place. Warns loudly when no currency has been set yet.
 */
export function CurrencyBadge({ onChange }: CurrencyBadgeProps) {
  const { showNotification, showConfirm } = useNotification();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [current, setCurrent] = useState<Currency | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await AuthService.getMe();
        const id = me.data.organization_id;
        setCanEdit(me.data.role !== "staff");
        if (!id) return;
        setOrgId(id);
        const org = await OrganizationService.get(id);
        setCurrent(org.data.currency || null);
      } catch (e) {
        console.error("Failed to load organization currency", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: rect.bottom + 6,
      left: Math.max(
        8,
        Math.min(
          rect.right - POPOVER_WIDTH,
          window.innerWidth - POPOVER_WIDTH - 8,
        ),
      ),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (currencies.length === 0) {
      CurrencyService.getAll()
        .then((res) => setCurrencies(res.data.results || res.data))
        .catch((e) => console.error("Failed to load currencies", e));
    }
    const close = (e: Event) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", () => setOpen(false), { once: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (c: Currency) => {
    if (!orgId || c.id === current?.id) {
      setOpen(false);
      return;
    }
    setOpen(false);
    showConfirm({
      title: "Change currency",
      message: `Switch your organization's currency to ${c.name} (${c.symbol})? Prices and costs across the app will be shown in ${c.code}. Amounts are not converted.`,
      confirmText: `Use ${c.code}`,
      onConfirm: async () => {
        try {
          setSaving(true);
          await OrganizationService.patch(orgId, { currency_id: c.id });
          setCurrent(c);
          localStorage.setItem("currencySymbol", c.symbol);
          onChange?.(c.symbol);
          showNotification(`Currency set to ${c.code}`, "success");
        } catch (e) {
          console.error(e);
          showNotification("Failed to update currency.", "error");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  if (!loaded || !orgId) return null;

  const missing = !current;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? currencies.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
      )
    : currencies;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={!canEdit || saving}
        onClick={() => setOpen((o) => !o)}
        title={
          missing
            ? "No currency set — click to choose your local currency"
            : canEdit
              ? "Organization currency — click to change"
              : "Organization currency"
        }
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-colors shadow-sm disabled:cursor-default",
          missing
            ? "bg-amber-500/10 border-amber-500/40 text-amber-600 hover:bg-amber-500/20 animate-pulse"
            : "bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--bg-app)]",
        )}
      >
        {missing ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Coins className="w-4 h-4 text-brand-primary" />
        )}
        <span style={{ fontFamily: "'Noto Sans', sans-serif" }}>
          {missing ? "Set currency" : `${current!.symbol} ${current!.code}`}
        </span>
        {canEdit && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
            className="fixed z-[200] bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="p-3 border-b border-[var(--border-soft)]">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Organization currency
              </p>
              <div className="flex items-center gap-2 px-2.5 py-2 bg-[var(--bg-app)] rounded-lg border border-[var(--border-soft)]">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search currency..."
                  className="flex-1 bg-transparent outline-none text-sm text-[var(--text-main)]"
                />
              </div>
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => choose(c)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-[var(--bg-app)] transition-colors"
                  >
                    <span
                      className="w-8 text-center font-bold text-[var(--text-main)]"
                      style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                      {c.symbol}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-[var(--text-main)] truncate">
                        {c.name}
                      </span>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {c.code}
                      </span>
                    </span>
                    {c.id === current?.id && (
                      <Check className="w-4 h-4 text-brand-primary" />
                    )}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3.5 py-4 text-sm text-[var(--text-muted)] text-center">
                  {currencies.length ? "No match." : "Loading..."}
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
