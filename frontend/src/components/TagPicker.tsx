import React from "react";
import { Check } from "lucide-react";
import { cn } from "../utils";

export interface MarketplaceTagOption {
  id: number;
  name: string;
  description?: string;
}

interface TagPickerProps {
  tags: MarketplaceTagOption[];
  value: number[];
  onChange: (ids: number[]) => void;
  emptyText?: string;
}

/** Toggleable chips for picking global marketplace tags. */
export function TagPicker({
  tags,
  value,
  onChange,
  emptyText = "No marketplace tags have been set up yet.",
}: TagPickerProps) {
  if (tags.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">{emptyText}</p>;
  }
  const toggle = (id: number) =>
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const selected = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={selected}
            title={tag.description || undefined}
            onClick={() => toggle(tag.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors",
              selected
                ? "bg-brand-primary border-brand-primary text-white"
                : "bg-[var(--bg-app)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-brand-primary/50 hover:text-[var(--text-main)]",
            )}
          >
            {selected && <Check className="w-3 h-3" />}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
