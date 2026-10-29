import { useState, useEffect } from "react";
import { UserService } from "../../api";
import { useNotification } from "../../context/NotificationContext";
import { Settings, Save } from "lucide-react";

export function GlobalConfig() {
  const [config, setConfig] = useState({
    free_tier_monthly_quota: 10,
    max_organizations_per_user: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await UserService.getGlobalConfig();
        if (res.data) {
          setConfig(res.data);
        }
      } catch (err: any) {
        showNotification(
          err.response?.data?.error || "Failed to load global config.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await UserService.updateGlobalConfig(config);
      if (res.data) {
        setConfig(res.data);
        showNotification("Global config updated successfully.", "success");
      }
    } catch (err: any) {
      showNotification(
        err.response?.data?.error || "Failed to update global config.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <Settings className="w-8 h-8 text-brand-primary p-1.5 bg-brand-primary/10 rounded-xl" />
            Global Configuration
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Manage system-wide defaults and quotas for all users.
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl overflow-hidden shadow-sm">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-main)]">
                Free Tier Monthly Quota (Invoices/Bookings)
              </label>
              <input
                type="number"
                min="0"
                value={config.free_tier_monthly_quota}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    free_tier_monthly_quota: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all bg-[var(--bg-app)] text-[var(--text-main)]"
                required
              />
              <p className="text-xs text-[var(--text-muted)]">
                The number of free transactions a standard user is allowed per
                month.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-main)]">
                Max Organizations Per User
              </label>
              <input
                type="number"
                min="1"
                value={config.max_organizations_per_user}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    max_organizations_per_user: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all bg-[var(--bg-app)] text-[var(--text-main)]"
                required
              />
              <p className="text-xs text-[var(--text-muted)]">
                The maximum number of businesses a single user can create or
                own.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--border-soft)] flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-brand-accent px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-brand-primary/20 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
