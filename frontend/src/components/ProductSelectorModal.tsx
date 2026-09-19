import React, { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/src/utils";

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  currencySymbol: string;
  onSelect: (selectedUnits: any[]) => void;
}

export function ProductSelectorModal({
  isOpen,
  onClose,
  products,
  currencySymbol,
  onSelect,
}: ProductSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<number>>(
    new Set(),
  );

  // Flatten products into selectable units
  const allUnits = useMemo(() => {
    return products.flatMap((p) =>
      (p.units || []).map((u: any) => ({
        ...u,
        product: p,
        displayName:
          u.name ||
          `${p.name}${u.serial_number ? ` (${u.serial_number})` : ""}`,
        price: parseFloat(u.rental_price || 0),
      })),
    );
  }, [products]);

  const filteredUnits = useMemo(() => {
    if (!searchQuery) return allUnits;
    const lowerQuery = searchQuery.toLowerCase();
    return allUnits.filter((u) =>
      u.displayName.toLowerCase().includes(lowerQuery),
    );
  }, [allUnits, searchQuery]);

  const toggleUnit = (unitId: number) => {
    const next = new Set(selectedUnitIds);
    if (next.has(unitId)) {
      next.delete(unitId);
    } else {
      next.add(unitId);
    }
    setSelectedUnitIds(next);
  };

  const handleConfirm = () => {
    const selected = allUnits.filter((u) =>
      selectedUnitIds.has(u.product_unit_id),
    );
    onSelect(selected);
    setSelectedUnitIds(new Set()); // Reset on success
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm sm:items-center sm:p-0">
      <div
        className="fixed inset-0 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-[var(--bg-app)] rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-[var(--border-soft)] w-full bottom-0 absolute sm:relative sm:bottom-auto rounded-b-none sm:rounded-b-3xl">
        <div className="p-4 sm:p-6 border-b border-[var(--border-soft)] flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] font-display">
            Select Products
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border-soft)] bg-[var(--bg-surface)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] outline-none focus:border-brand-primary text-sm font-medium transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2">
          {filteredUnits.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm font-medium">
              No products found.
            </div>
          ) : (
            filteredUnits.map((u) => {
              const isSelected = selectedUnitIds.has(u.product_unit_id);
              return (
                <div
                  key={u.product_unit_id}
                  onClick={() => toggleUnit(u.product_unit_id)}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all",
                    isSelected
                      ? "border-brand-primary bg-brand-primary/5"
                      : "border-[var(--border-soft)] bg-[var(--bg-surface)] hover:border-[var(--border-subtle)] hover:shadow-sm",
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-brand-primary text-white"
                        : "bg-[var(--bg-app)] border border-[var(--border-soft)]",
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-main)] truncate">
                      {u.displayName}
                    </p>
                    <p className="inline-block px-1.5 py-0.5 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded text-[10px] text-[var(--text-muted)] font-medium uppercase mt-0.5">
                      {u.product.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-[var(--text-main)]">
                      {currencySymbol} {u.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-[var(--border-soft)] flex gap-3 bg-[var(--bg-surface)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] font-bold hover:bg-[var(--bg-app)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
          >
            Add Selected ({selectedUnitIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
