import React, { useState } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { AuthService } from "../api";
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
  const { showNotification } = useNotification();

  if (!organizations || organizations.length <= 1) {
    return null;
  }

  const currentOrg = organizations.find((o) => o.id === currentOrgId);

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
              {organizations.map((org) => (
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
