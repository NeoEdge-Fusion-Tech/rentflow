import React, { useState, useEffect } from "react";
import { Settings, Save, Clock, CalendarDays, CheckCircle } from "lucide-react";
import { api } from "../api";
import { useNotification } from "../context/NotificationContext";

export function BookingSettings() {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    available_days: "Monday,Tuesday,Wednesday,Thursday,Friday",
    open_time: "09:00:00",
    close_time: "17:00:00",
    is_accepting_requests: true,
    public_url_slug: "",
    storefront_name: "",
  });

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/inventory/booking-settings/");
      if (res.data) {
        setSettings(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/inventory/booking-settings/", settings);
      showNotification("Booking settings updated successfully", "success");
    } catch (e) {
      console.error(e);
      showNotification("Failed to update booking settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    const currentDays = settings.available_days
      ? settings.available_days.split(",")
      : [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    // Sort days based on original order
    const sortedDays = daysOfWeek.filter((d) => newDays.includes(d));
    setSettings({ ...settings, available_days: sortedDays.join(",") });
  };

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
              {daysOfWeek.map((day) => {
                const isSelected =
                  settings.available_days &&
                  settings.available_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                        : "bg-[var(--bg-app)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--border-subtle)]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Select the days of the week when setups and set downs can be
              scheduled.
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
          </div>

          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-accent transition-colors disabled:opacity-50"
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
