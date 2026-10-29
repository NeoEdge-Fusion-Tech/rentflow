import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Clock,
  CalendarDays,
  CheckCircle,
  Check,
  CreditCard,
} from "lucide-react";
import { api } from "../api";
import { useNotification } from "../context/NotificationContext";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const WEEKDAYS = DAYS_OF_WEEK.slice(0, 5);

// The API returns a list, but older records may hold "Monday,Tuesday".
const parseDays = (value: unknown): string[] => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const picked = raw.map((d) => String(d).trim().toLowerCase());
  return DAYS_OF_WEEK.filter((d) => picked.includes(d.toLowerCase()));
};

// <input type="time"> wants HH:MM; the API sends HH:MM:SS (or null).
const toTimeInput = (value: unknown, fallback: string) =>
  typeof value === "string" && value ? value.slice(0, 5) : fallback;

export function BookingSettings() {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    available_days: WEEKDAYS as string[],
    open_time: "09:00",
    close_time: "17:00",
    is_accepting_requests: true,
    online_payments_enabled: true,
    deposit_percent: 100,
    public_url_slug: "",
    storefront_name: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/inventory/booking-settings/");
      if (res.data) {
        const days = parseDays(res.data.available_days);
        setSettings({
          available_days: days.length ? days : WEEKDAYS,
          open_time: toTimeInput(res.data.open_time, "09:00"),
          close_time: toTimeInput(res.data.close_time, "17:00"),
          is_accepting_requests: res.data.is_accepting_requests ?? true,
          online_payments_enabled: res.data.online_payments_enabled ?? true,
          deposit_percent: res.data.deposit_percent ?? 100,
          public_url_slug: res.data.public_url_slug || "",
          storefront_name: res.data.storefront_name || "",
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    try {
      await api.put("/inventory/booking-settings/", settings);
      showNotification("Booking settings updated successfully", "success");
    } catch (e: any) {
      console.error(e);
      const data = e.response?.data;
      const detail =
        data && typeof data === "object"
          ? Object.values(data).flat().filter(Boolean).join(" ")
          : "";
      showNotification(detail || "Failed to update booking settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setSettings((prev) => {
      const current = prev.available_days;
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return {
        ...prev,
        available_days: DAYS_OF_WEEK.filter((d) => next.includes(d)),
      };
    });
  };

  const hoursValid =
    !settings.open_time ||
    !settings.close_time ||
    settings.open_time < settings.close_time;
  const depositValid =
    !settings.online_payments_enabled ||
    (Number.isInteger(settings.deposit_percent) &&
      settings.deposit_percent >= 1 &&
      settings.deposit_percent <= 100);
  const isFormValid =
    settings.available_days.length > 0 && hoursValid && depositValid;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-primary" />
            Booking Settings
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Configure when customers can request rentals from you.
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          {/* Storefront Name */}
          <div>
            <h3 className="font-bold text-[var(--text-main)] mb-1">
              Storefront Name
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              This name will be displayed at the top of your public rental page.
              If left blank, your legal organization name will be used.
            </p>
            <input
              type="text"
              value={settings.storefront_name || ""}
              onChange={(e) =>
                setSettings({ ...settings, storefront_name: e.target.value })
              }
              placeholder="E.g., Awesome Rentals"
              className="w-full sm:max-w-md border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-surface)] text-[var(--text-main)] transition-colors"
            />
          </div>

          {/* Status Toggle */}
          <div>
            <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-brand-primary" />
              Accepting Requests
            </h3>
            <label className="flex items-center gap-3 p-3 border border-[var(--border-soft)] rounded-xl bg-[var(--bg-app)] cursor-pointer hover:bg-[var(--bg-app)]/80 transition-colors w-fit">
              <input
                type="checkbox"
                checked={settings.is_accepting_requests}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    is_accepting_requests: e.target.checked,
                  })
                }
                className="w-5 h-5 text-brand-primary rounded focus:ring-brand-primary accent-brand-primary cursor-pointer"
              />
              <span className="text-sm font-medium text-[var(--text-main)]">
                {settings.is_accepting_requests
                  ? "Currently Accepting Rental Requests"
                  : "Not Accepting Requests"}
              </span>
            </label>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              If disabled, your public rental page will not accept new bookings.
            </p>
          </div>

          {/* Online payments */}
          <div className="pt-6 border-t border-[var(--border-soft)]">
            <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-brand-primary" />
              Online Payments
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Let guests pay when they book from your storefront or the
              marketplace. Paid bookings are marked <strong>Booked</strong>, and
              the guest is emailed their invoice and receipt.
            </p>
            <label className="flex items-center gap-3 p-3 border border-[var(--border-soft)] rounded-xl bg-[var(--bg-app)] cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={settings.online_payments_enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    online_payments_enabled: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-brand-primary cursor-pointer"
              />
              <span className="text-sm font-medium text-[var(--text-main)]">
                {settings.online_payments_enabled
                  ? "Guests can pay online or just send a request"
                  : "Requests only (no online payment)"}
              </span>
            </label>
            {settings.online_payments_enabled && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Amount paid upfront (% of booking total)
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative w-32">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.deposit_percent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          deposit_percent: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 pr-8 outline-none focus:border-brand-primary text-[var(--text-main)]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
                      %
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[25, 50, 100].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setSettings({ ...settings, deposit_percent: p })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          settings.deposit_percent === p
                            ? "bg-brand-primary text-[var(--text-on-brand)] border-brand-primary"
                            : "border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        }`}
                      >
                        {p === 100 ? "Full payment" : `${p}%`}
                      </button>
                    ))}
                  </div>
                </div>
                <p
                  className={`text-xs mt-2 ${
                    depositValid
                      ? "text-[var(--text-muted)]"
                      : "text-rose-500 font-medium"
                  }`}
                >
                  {depositValid
                    ? settings.deposit_percent === 100
                      ? "Guests pay the full amount when booking."
                      : `Guests pay ${settings.deposit_percent}% now; the booking shows as partially paid until the balance is settled.`
                    : "Enter a whole percentage between 1 and 100."}
                </p>
              </div>
            )}
          </div>

          {/* Custom Public URL */}
          <div className="pt-6 border-t border-[var(--border-soft)]">
            <h3 className="font-bold text-[var(--text-main)] mb-1">
              Your Public Storefront (URL)
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Share this URL with your clients. You can customize the slug below
              to make it short and memorable.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center flex-1">
                <span className="px-4 py-2.5 bg-[var(--bg-app)] border border-r-0 border-[var(--border-soft)] rounded-l-xl text-[var(--text-muted)] text-sm whitespace-nowrap">
                  {window.location.origin}/public/store/
                </span>
                <input
                  type="text"
                  value={settings.public_url_slug || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      public_url_slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                  placeholder="my-cool-store"
                  className="flex-1 w-full border border-[var(--border-soft)] rounded-r-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-surface)] text-[var(--text-main)] transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/public/store/${
                      settings.public_url_slug ||
                      localStorage.getItem("org_id") ||
                      "ID"
                    }`,
                  );
                  showNotification("Store URL copied to clipboard!", "success");
                }}
                className="px-6 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] text-sm font-bold rounded-xl hover:border-brand-primary/50 transition-colors shrink-0"
              >
                Copy URL
              </button>
            </div>
          </div>

          {/* Available Days */}
          <div>
            <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2 mb-3">
              <CalendarDays className="w-5 h-5 text-brand-primary" />
              Available Days
            </h3>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = settings.available_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleDay(day)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                        : "bg-[var(--bg-app)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-brand-primary/50 hover:text-[var(--text-main)]"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              <button
                type="button"
                onClick={() =>
                  setSettings((p) => ({ ...p, available_days: WEEKDAYS }))
                }
                className="font-bold text-brand-primary hover:underline"
              >
                Weekdays
              </button>
              <button
                type="button"
                onClick={() =>
                  setSettings((p) => ({ ...p, available_days: DAYS_OF_WEEK }))
                }
                className="font-bold text-brand-primary hover:underline"
              >
                Every day
              </button>
              <button
                type="button"
                onClick={() =>
                  setSettings((p) => ({ ...p, available_days: [] }))
                }
                className="font-bold text-[var(--text-muted)] hover:underline"
              >
                Clear
              </button>
            </div>
            <p
              className={`text-xs mt-2 ${
                settings.available_days.length
                  ? "text-[var(--text-muted)]"
                  : "text-rose-500 font-medium"
              }`}
            >
              {settings.available_days.length
                ? "Select the days of the week when setups and set downs can be scheduled."
                : "Select at least one day. To stop taking bookings, turn off “Accepting Requests” instead."}
            </p>
          </div>

          {/* Operating Hours */}
          <div>
            <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-brand-primary" />
              Operating Hours
            </h3>
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Open Time
                </label>
                <input
                  type="time"
                  value={settings.open_time}
                  onChange={(e) =>
                    setSettings({ ...settings, open_time: e.target.value })
                  }
                  className="bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 outline-none focus:border-brand-primary text-[var(--text-main)]"
                />
              </div>
              <span className="text-[var(--text-muted)] mt-5">to</span>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Close Time
                </label>
                <input
                  type="time"
                  value={settings.close_time}
                  onChange={(e) =>
                    setSettings({ ...settings, close_time: e.target.value })
                  }
                  className="bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 outline-none focus:border-brand-primary text-[var(--text-main)]"
                />
              </div>
            </div>
            {!hoursValid && (
              <p className="text-xs text-rose-500 font-medium mt-2">
                Close time must be later than open time.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end">
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
