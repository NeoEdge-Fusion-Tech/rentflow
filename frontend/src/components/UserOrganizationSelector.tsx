import React, { useState } from "react";
import { Building2, ChevronDown, Check, Plus, X } from "lucide-react";
import { AuthService, OrganizationService } from "../api";
import { useNotification } from "../context/NotificationContext";

interface UserOrganizationSelectorProps {
  organizations: { id: number; name: string }[];
  currentOrgId: number;
}

export function UserOrganizationSelector({
  organizations,
  currentOrgId,
}: UserOrganizationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const { showNotification } = useNotification();
  const currentOrg =
    organizations?.find((o) => Number(o.id) === Number(currentOrgId)) ||
    organizations?.[0];

  const handleSelect = async (id: number) => {
    if (id === currentOrgId) {
      setIsOpen(false);
      return;
    }

    try {
      await AuthService.switchOrganization({ organization_id: id });
      setIsOpen(false);
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      showNotification(
        e.response?.data?.error || "Failed to switch organization",
        "error",
      );
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      // Create new organization
      const res = await OrganizationService.create({ name: newOrgName });

      // Automatically switch to it
      await AuthService.switchOrganization({ organization_id: res.data.id });

      showNotification("Business created successfully!", "success");
      setIsCreating(false);
      setIsOpen(false);
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      showNotification(
        e.response?.data?.error || "Failed to create business",
        "error",
      );
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] transition-all duration-200 text-sm shadow-sm hover:border-brand-primary hover:bg-[var(--bg-app)]"
      >
        <Building2 className="w-4 h-4 text-[var(--text-muted)] group-hover:text-brand-primary" />
        <span className="max-w-[120px] truncate font-medium">
          {currentOrg?.name || "Select Business"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-300 text-[var(--text-muted)] ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[var(--bg-app)]/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-64 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/50">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                Switch Business
              </span>
            </div>

            <div className="max-h-[250px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--border-soft)]">
              {organizations?.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelect(org.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between mb-1 group ${
                    currentOrgId === org.id
                      ? "bg-brand-primary/10 text-brand-primary font-bold"
                      : "hover:bg-[var(--bg-app)] text-[var(--text-main)]"
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  {currentOrgId === org.id && (
                    <Check className="w-4 h-4 text-brand-primary" />
                  )}
                </button>
              ))}

              <div className="border-t border-[var(--border-subtle)] my-1 pt-1">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 hover:bg-[var(--bg-app)] text-brand-primary font-medium group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Create New Business
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsCreating(false)}
          />
          <div className="relative bg-[var(--bg-surface)] w-full max-w-sm rounded-2xl shadow-2xl border border-[var(--border-soft)] animate-in zoom-in-95 duration-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[var(--text-main)]">
                Create New Business
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-[var(--text-muted)] hover:bg-[var(--bg-app)] p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!newOrgName.trim()}
                className="w-full bg-brand-primary text-white py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Create & Switch
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
